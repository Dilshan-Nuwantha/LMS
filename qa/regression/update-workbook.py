"""Adds qa/results/workbook-rows.json to the Bug Tracker and QA Test Cases tabs.

Edits the sheet XML directly so every other part of the workbook stays as it is.
Also widens the Dashboard formulas and the dropdowns to row 1000, which the
conditional formatting on these tabs already covers. Refuses to write over a used row.
"""
import json
import os
import re
import sys
import zipfile
from xml.sax.saxutils import escape

QA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BOOK = os.path.join(QA, 'TENZE_LMS_Management_Workbook_Updated.xlsx')
ROWS = json.load(open(os.path.join(QA, 'results', 'workbook-rows.json'), encoding='utf-8'))
LAST_ROW = 1000
ALLOWED = {
    'bug': {4: {'Critical', 'High', 'Medium', 'Low'}, 5: {'Critical', 'High', 'Medium', 'Low'},
            7: {'Open'}, 9: {'Local', 'Staging', 'Production'}},
    'test': {7: {'Pass', 'Fail'}, 8: {'Manual', 'Automated'}, 9: {'Critical', 'High', 'Medium', 'Low'}},
}
ROW_RE = re.compile(r'<row r="(\d+)"([^>]*?)(?:/>|>(.*?)</row>)', re.S)
CELL_RE = re.compile(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
BAD_XML = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')


def col(n):
    return chr(ord('A') + n)


def styles(xml, row):
    """Column to style index for a template row."""
    body = next(m.group(3) for m in ROW_RE.finditer(xml) if int(m.group(1)) == row)
    return {c.group(1): re.search(r's="(\d+)"', c.group(2)).group(1) for c in CELL_RE.finditer(body)}


def add_rows(xml, rows, first_row, even_style, odd_style):
    new = {}
    for i, values in enumerate(rows):
        n = first_row + i
        style = even_style if n % 2 == 0 else odd_style
        cells = []
        for c, value in enumerate(values):
            ref, s = f'{col(c)}{n}', style[col(c)]
            if value:
                text = escape(BAD_XML.sub('', value))
                cells.append(f'<c r="{ref}" s="{s}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>')
            else:
                cells.append(f'<c r="{ref}" s="{s}"/>')
        new[n] = f'<row r="{n}">{"".join(cells)}</row>'

    def swap(m):
        n = int(m.group(1))
        if n not in new:
            return m.group(0)
        if m.group(3) and '<v>' in m.group(3):
            sys.exit(f'Row {n} already has data, nothing was changed')
        return new[n]

    return ROW_RE.sub(swap, xml)


def next_free_row(xml):
    used = [int(m.group(1)) for m in ROW_RE.finditer(xml) if m.group(3) and '<v>' in m.group(3)]
    return max(used) + 1


def widen_dropdowns(xml):
    return re.sub(r'(sqref="[A-Z]+2:[A-Z]+)\d+("><formula1>)', rf'\g<1>{LAST_ROW}\g<2>', xml)


def set_value(xml, ref, value):
    pattern = rf'(<c r="{ref}"[^>]*>\s*<f[^>]*>.*?</f>\s*<v>).*?(</v>)'
    xml, count = re.subn(pattern, rf'\g<1>{value}\g<2>', xml, count=1, flags=re.S)
    if count != 1:
        sys.exit(f'Dashboard cell {ref} not found, nothing was changed')
    return xml


def existing(xml, shared, column):
    """Text of a column for every used row after the header."""
    out = []
    for m in ROW_RE.finditer(xml):
        if int(m.group(1)) == 1 or not m.group(3):
            continue
        for c in CELL_RE.finditer(m.group(3)):
            v = re.search(r'<v>(.*?)</v>', c.group(3) or '')
            if c.group(1) == column and v:
                out.append((int(m.group(1)), shared[int(v.group(1))]))
    return dict(out)


def main():
    for kind, rows in (('bug', ROWS['bugRows']), ('test', ROWS['testRows'])):
        for row in rows:
            for index, allowed in ALLOWED[kind].items():
                if row[index] not in allowed:
                    sys.exit(f'{row[0]}: "{row[index]}" is not an allowed value')

    with zipfile.ZipFile(BOOK) as z:
        items = [(i, z.read(i.filename)) for i in z.infolist()]
    files = {i.filename: data for i, data in items}
    dash = files['xl/worksheets/sheet1.xml'].decode('utf-8')
    bug = files['xl/worksheets/sheet4.xml'].decode('utf-8')
    test = files['xl/worksheets/sheet5.xml'].decode('utf-8')
    book = files['xl/workbook.xml'].decode('utf-8')
    shared = [''.join(re.findall(r'<t[^>]*>(.*?)</t>', s, re.S)) for s in
              re.findall(r'<si>(.*?)</si>', files['xl/sharedStrings.xml'].decode('utf-8'), re.S)]

    bug_first, test_first = next_free_row(bug), next_free_row(test)
    if bug_first != 6 or test_first != 24:
        sys.exit(f'Expected next rows 6 and 24, found {bug_first} and {test_first}, nothing was changed')

    old_bug = {'E': existing(bug, shared, 'E'), 'H': existing(bug, shared, 'H')}
    old_test_results = existing(test, shared, 'H')

    bug = widen_dropdowns(add_rows(bug, ROWS['bugRows'], bug_first, styles(bug, 6), styles(bug, 7)))
    test = widen_dropdowns(add_rows(test, ROWS['testRows'], test_first, styles(test, 24), styles(test, 25)))

    dash = re.sub(r"('Bug Tracker'!\$[A-Z]\$2:\$[A-Z]\$)50\b", rf'\g<1>{LAST_ROW}', dash)
    dash = re.sub(r"('QA Test Cases'!\$[A-Z]\$2:\$[A-Z]\$)100\b", rf'\g<1>{LAST_ROW}', dash)

    # Stored results, so viewers that do not recalculate still show the right numbers
    severities = list(old_bug['E'].values()) + [r[4] for r in ROWS['bugRows']]
    statuses = list(old_bug['H'].values()) + [r[7] for r in ROWS['bugRows']]
    results = list(old_test_results.values()) + [r[7] for r in ROWS['testRows']]
    total, executed = len(results), sum(r != 'Not Run' for r in results)
    passed, failed = results.count('Pass'), results.count('Fail')
    open_sev = [s for s, st in zip(severities, statuses) if st != 'Closed']
    closed = statuses.count('Closed')
    values = {
        'F9': total, 'F10': executed, 'F11': passed, 'F12': failed,
        'F13': results.count('Blocked'), 'F14': results.count('Skipped'),
        'F15': passed / (passed + failed), 'F16': executed / total,
        'B20': len(statuses), 'B21': len(open_sev), 'B22': open_sev.count('Critical'), 'B23': open_sev.count('High'),
        'B24': open_sev.count('Medium'), 'B25': open_sev.count('Low'), 'B26': closed, 'B27': closed / len(statuses),
    }
    for ref, value in values.items():
        dash = set_value(dash, ref, value)

    book = book.replace('<calcPr/>', '<calcPr fullCalcOnLoad="1"/>')

    files['xl/worksheets/sheet1.xml'] = dash.encode('utf-8')
    files['xl/worksheets/sheet4.xml'] = bug.encode('utf-8')
    files['xl/worksheets/sheet5.xml'] = test.encode('utf-8')
    files['xl/workbook.xml'] = book.encode('utf-8')

    temp = BOOK + '.tmp'
    with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED) as z:
        for info, _ in items:
            z.writestr(info.filename, files[info.filename])
    os.replace(temp, BOOK)
    print(json.dumps(values, indent=1))


main()
