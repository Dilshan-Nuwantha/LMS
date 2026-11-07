"""Syncs qa/results/workbook-rows.json into the Bug Tracker and QA Test Cases tabs.

Patches only the cells it owns in the sheet XML, so team edits and every other part
of the workbook stay as they are. New test cases are added below the last used row.
    python update-workbook.py [output.xlsx]
"""
import html
import json
import os
import re
import sys
import zipfile
from xml.sax.saxutils import escape

QA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BOOK = os.path.join(QA, 'TENZE_LMS_Management_Workbook_Updated.xlsx')
DATA = json.load(open(os.path.join(QA, 'results', 'workbook-rows.json'), encoding='utf-8'))
ROW_RE = re.compile(r'<row r="(\d+)"([^>]*?)(?:/>|>(.*?)</row>)', re.S)
CELL_RE = re.compile(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
BAD_XML = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')
TEST_FIELDS = 'BCDEFGHIJKLMN'
BUG_COLUMNS = 'ABCDEFGHIJKLMNOPQRS'
# Existing test rows only get the run results, so team edits to other columns stay
RESULT_FIELDS = 'GHLMN'
BOXES = {
    'bug': ('U', 'V', ['Open', 'Assigned', 'In Progress', 'Fixed', 'Retesting', 'Closed', 'Reopened']),
    'test': ('P', 'Q', ['Not Run', 'Pass', 'Fail', 'Blocked', 'Skipped']),
}
ALLOWED = {
    'bug': {'Open', 'Fixed', 'Closed'},
    'test': {'Pass', 'Fail'},
}


def cell_text(attrs, inner, shared):
    if not inner:
        return ''
    if 't="s"' in attrs:
        return html.unescape(shared[int(re.search(r'<v>(.*?)</v>', inner).group(1))])
    t = re.search(r'<t[^>]*>(.*?)</t>', inner, re.S)
    return html.unescape(t.group(1)) if t else ''


def read_rows(xml, shared):
    """Row number to {column: text}, for rows holding an id in column A."""
    rows = {}
    for m in ROW_RE.finditer(xml):
        values = {c.group(1): cell_text(c.group(2), c.group(3), shared) for c in CELL_RE.finditer(m.group(3) or '')}
        if values.get('A') and int(m.group(1)) != 1:
            rows[int(m.group(1))] = values
    return rows


def styles_of(xml, row):
    body = next(m.group(3) for m in ROW_RE.finditer(xml) if int(m.group(1)) == row)
    return {c.group(1): re.search(r's="(\d+)"', c.group(2)).group(1) for c in CELL_RE.finditer(body)}


def inline_cell(column, row, style, value):
    ref = f'{column}{row}'
    if not value:
        return f'<c r="{ref}" s="{style}"/>'
    text = escape(BAD_XML.sub('', value))
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'


def patch(xml, changes, new_rows):
    """changes: row to {column: value}. new_rows: row to (style map, {column: value})."""
    def swap(m):
        n = int(m.group(1))
        if n in new_rows:
            style, values = new_rows[n]
            if m.group(3) and '<v>' in m.group(3):
                sys.exit(f'Row {n} already has data, nothing was changed')
            cells = ''.join(inline_cell(c, n, style[c], values.get(c, '')) for c in style)
            return f'<row r="{n}">{cells}</row>'
        if n not in changes:
            return m.group(0)

        def swap_cell(c):
            if c.group(1) not in changes[n]:
                return c.group(0)
            style = re.search(r's="(\d+)"', c.group(2)).group(1)
            return inline_cell(c.group(1), n, style, changes[n][c.group(1)])

        body = CELL_RE.sub(swap_cell, m.group(3))
        return f'<row r="{n}"{m.group(2)}>{body}</row>'

    return ROW_RE.sub(swap, xml)


def set_value(xml, ref, value):
    pattern = rf'(<c r="{ref}"[^>]*>\s*<f[^>]*>.*?</f>\s*<v>).*?(</v>)'
    xml, count = re.subn(pattern, rf'\g<1>{value}\g<2>', xml, count=1, flags=re.S)
    if count != 1:
        sys.exit(f'Dashboard cell {ref} not found, nothing was changed')
    return xml


def main():
    for row in DATA['bugRows']:
        if row[7] not in ALLOWED['bug']:
            sys.exit(f'{row[0]}: "{row[7]}" is not an allowed status')
    for row in DATA['testRows']:
        if row[7] not in ALLOWED['test']:
            sys.exit(f'{row[0]}: "{row[7]}" is not an allowed result')

    with zipfile.ZipFile(BOOK) as z:
        items = [(i, z.read(i.filename)) for i in z.infolist()]
    files = {i.filename: data for i, data in items}
    dash = files['xl/worksheets/sheet1.xml'].decode('utf-8')
    bug = files['xl/worksheets/sheet4.xml'].decode('utf-8')
    test = files['xl/worksheets/sheet5.xml'].decode('utf-8')
    book = files['xl/workbook.xml'].decode('utf-8')
    shared = [''.join(re.findall(r'<t[^>]*>(.*?)</t>', s, re.S)) for s in
              re.findall(r'<si>(.*?)</si>', files['xl/sharedStrings.xml'].decode('utf-8'), re.S)]

    bugs, tests = read_rows(bug, shared), read_rows(test, shared)
    bug_at = {v['A']: n for n, v in bugs.items()}
    test_at = {v['A']: n for n, v in tests.items()}

    # Bug status: a row is only touched when its title proves it is the same bug
    bug_changes, new_bugs = {}, {}
    next_bug = max(bugs) + 1
    bug_even, bug_odd = styles_of(bug, max(bugs) - 1), styles_of(bug, max(bugs))
    if max(bugs) % 2 == 0:
        bug_even, bug_odd = bug_odd, bug_even
    for row in DATA['bugRows']:
        n = bug_at.get(row[0])
        if n is None:
            values = dict(zip(BUG_COLUMNS, row))
            new_bugs[next_bug] = (bug_even if next_bug % 2 == 0 else bug_odd, values)
            bugs[next_bug] = values
            next_bug += 1
            continue
        if bugs[n].get('C') != row[2]:
            sys.exit(f'{row[0]} does not match the workbook, nothing was changed')
        # An open bug is the team's to move through the lifecycle
        if row[7] == 'Open':
            continue
        change = {'H': row[7]}
        if row[14]:
            change['O'] = row[14]
        bug_changes[n] = change
    for bug_id, verified in DATA['closedBugs'].items():
        if bugs[bug_at[bug_id]].get('H') == 'Fixed':
            bug_changes[bug_at[bug_id]] = {'H': 'Closed', 'O': verified}
    for n, change in bug_changes.items():
        bugs[n].update(change)

    # Test results: existing rows are updated, new cases go below the last used row
    test_changes, new_rows = {}, {}
    next_row = max(tests) + 1
    even, odd = styles_of(test, max(tests) - 1), styles_of(test, max(tests))
    if max(tests) % 2 == 0:
        even, odd = odd, even
    for row in DATA['testRows']:
        fields = dict(zip(TEST_FIELDS, row[1:]))
        n = test_at.get(row[0])
        if n is None:
            new_rows[next_row] = (even if next_row % 2 == 0 else odd, {'A': row[0], **fields})
            tests[next_row] = {'A': row[0], **fields}
            next_row += 1
        else:
            result_fields = {k: v for k, v in fields.items() if k in RESULT_FIELDS}
            test_changes[n] = result_fields
            tests[n].update(result_fields)

    bug = patch(bug, bug_changes, new_bugs)
    test = patch(test, test_changes, new_rows)

    # Stored results, so viewers that do not recalculate still show the right numbers
    results = [v.get('H') for v in tests.values()]
    total, executed = len(results), sum(r != 'Not Run' for r in results)
    passed, failed = results.count('Pass'), results.count('Fail')
    not_closed = [v.get('E') for v in bugs.values() if v.get('H') != 'Closed']
    closed = len(bugs) - len(not_closed)
    values = {
        'F9': total, 'F10': executed, 'F11': passed, 'F12': failed,
        'F13': results.count('Blocked'), 'F14': results.count('Skipped'),
        'F15': passed / (passed + failed), 'F16': executed / total,
        'B20': len(bugs), 'B21': len(not_closed), 'B22': not_closed.count('Critical'), 'B23': not_closed.count('High'),
        'B24': not_closed.count('Medium'), 'B25': not_closed.count('Low'), 'B26': closed, 'B27': closed / len(bugs),
    }
    for ref, value in values.items():
        dash = set_value(dash, ref, value)

    # The status boxes hold formulas too, so their stored results are kept current as well
    def refresh_box(xml, box, rows):
        _, count, statuses = box
        found = [v.get('H') for v in rows.values()]
        for i, status in enumerate(statuses):
            xml = set_value(xml, f'{count}{i + 2}', found.count(status))
        return set_value(xml, f'{count}{len(statuses) + 2}', len(found))

    bug = refresh_box(bug, BOXES['bug'], bugs)
    test = refresh_box(test, BOXES['test'], tests)

    book = re.sub(r'<calcPr[^>]*/>', '<calcPr calcId="191029" fullCalcOnLoad="1"/>', book)

    files['xl/worksheets/sheet1.xml'] = dash.encode('utf-8')
    files['xl/worksheets/sheet4.xml'] = bug.encode('utf-8')
    files['xl/worksheets/sheet5.xml'] = test.encode('utf-8')
    files['xl/workbook.xml'] = book.encode('utf-8')

    out = sys.argv[1] if len(sys.argv) > 1 else BOOK
    temp = out + '.tmp'
    with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED) as z:
        for info, _ in items:
            z.writestr(info.filename, files[info.filename])
    os.replace(temp, out)
    print(json.dumps(values, indent=1))


main()
