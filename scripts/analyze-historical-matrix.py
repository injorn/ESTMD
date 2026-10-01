"""Read source XLSX XML without recalculating or modifying workbooks.

Source cells retain addresses, original formula text and Excel's cached values.
Run with bundled Python: analyze-historical-matrix.py [inventory|analyze].
"""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'analysis' / 'historical-matrix-2026-10-01'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def read_workbook(path):
    with ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(x.itertext()) for x in root.findall('s:si', NS)]
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        targets = {r.attrib['Id']: r.attrib['Target'] for r in rels}
        sheets = []
        for info in workbook.findall('s:sheets/s:sheet', NS):
            if info.attrib['name'].startswith('999_'):
                continue  # legacy price/personnel tables are not project effort evidence
            target = targets[info.attrib['{' + NS['r'] + '}id']]
            entry = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            document = ET.fromstring(archive.read(entry))
            cells = {}
            for cell in document.findall('s:sheetData/s:row/s:c', NS):
                address = cell.attrib['r']
                raw = cell.findtext('s:v', None, NS)
                kind = cell.attrib.get('t')
                formula = cell.findtext('s:f', None, NS)
                if kind == 's' and raw is not None:
                    value = strings[int(raw)]
                elif kind == 'inlineStr':
                    value = ''.join(cell.find('s:is', NS).itertext())
                elif kind in ('str', 'e'):
                    value = raw
                elif kind == 'b':
                    value = raw == '1'
                elif raw is not None:
                    try:
                        value = float(raw)
                    except ValueError:
                        value = raw
                else:
                    value = None
                if value is not None or formula is not None:
                    cells[address] = {'value': value, 'formula': formula, 'type': kind}
            sheets.append({'name': info.attrib['name'], 'state': info.attrib.get('state', 'visible'),
                           'cells': cells, 'merges': [m.attrib['ref'] for m in document.findall('s:mergeCells/s:mergeCell', NS)]})
        return {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'sheets': sheets}


def rows_of(sheet):
    rows = {}
    for address, cell in sheet['cells'].items():
        row = int(re.search(r'\d+', address).group())
        rows.setdefault(row, []).append((address, cell))
    return sorted(rows.items())


def inventory():
    OUT.mkdir(parents=True, exist_ok=True)
    books = [read_workbook(p) for p in sorted((ROOT / 'pttdigitalMD').glob('*.xlsx'))]
    (OUT / 'source-cells.json').write_text(json.dumps(books, ensure_ascii=False, indent=2), encoding='utf-8')
    lines = []
    for book in books:
        lines.append('\nFILE ' + book['file'])
        for sheet in book['sheets']:
            rows = rows_of(sheet)
            formula_count = sum(c['formula'] is not None for c in sheet['cells'].values())
            lines.append(f"  SHEET {sheet['name']} ({sheet['state']}): {len(rows)} populated rows, {len(sheet['cells'])} cells, {formula_count} formulas")
            for number, cells in [r for r in rows if r[0] <= 4]:
                texts = [f'{a}={str(c["value"])[:100]}' for a, c in cells if c['value'] is not None]
                lines.append('    ' + ' | '.join(texts[:16]))
    (OUT / 'inventory.txt').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))
    duplicates = {}
    for book in books:
        duplicates.setdefault(book['sha256'], []).append(book['file'])
    print('\nEXACT DUPLICATES', json.dumps([v for v in duplicates.values() if len(v) > 1], ensure_ascii=False))


PRIMARY = {
    'POT253411': 'PTT Digital', 'POT253571': 'ICT_Manday', 'POT253572': 'ICT_Manday',
    'POT253760': 'PTTDigital_Manday_Release', 'POT253954': 'E-Recruit adjust before EA',
    'POT254055': 'enh202(Re)+security+CR V2', 'POT254316': 'Cost Sheet', 'POT254392': 'PTTDigital_Manday',
    'POT254773': 'PTTDigital_Manday', 'POT255012': 'CostSheet', 'POT255017': 'ClickNGo Calsheet',
    'POT260876': 'Calsheet', 'POT261084': 'Digital_Manday', 'POT261134': 'Template for Other service',
    'POT261160': 'PTTDigital_Manday', 'POT261243': 'Sheet1', 'POT261336': 'DGT_Manday',
    'POT261375': 'Template for Other service', 'POT261434': 'Template for Other service',
    'POT261467': 'Digital_Manday', 'POT261677': 'Resource', 'POT261991': 'PTTDigital_Manday',
    'POT262125': 'Template for Other service',
}


def profile():
    books = json.loads((OUT / 'source-cells.json').read_text(encoding='utf-8'))
    lines = []
    for book in books:
        code = book['file'].split('_')[0]
        sheet = next(s for s in book['sheets'] if s['name'] == PRIMARY[code])
        lines.append('\nFILE ' + book['file'] + ' SHEET ' + sheet['name'])
        for number, cells in rows_of(sheet):
            if number <= 8 or any(re.search(r'(?i)total|sum|รวม|manday|man-day|mandays', str(c['value'])) for _, c in cells):
                lines.append(' | '.join(f'{a}={str(c["value"])[:180]}' + (f' [={c["formula"]}]' if c['formula'] else '') for a, c in cells if c['value'] is not None or c['formula']))
    (OUT / 'profiles.txt').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))


def analyze():
    """Emit reviewed aggregate evidence; no inferred roles or automatic L/M/H labels."""
    books = json.loads((OUT / 'source-cells.json').read_text(encoding='utf-8'))
    def sheet(code, name):
        return next(s for b in books if b['file'].startswith(code)
                    for s in b['sheets'] if s['name'] == name)
    def total(s, addresses):
        values = [s['cells'][a]['value'] for a in addresses]
        if any(type(v) not in (int, float) for v in values):
            raise ValueError('Missing/non-numeric evidence: ' + str(addresses))
        return sum(values)
    layouts = [
        ('POT253760', 'PTTDigital_Manday_Release', 41, 'DEFGHIJKLMNOP', ['I', 'J', 'K'], ['D'], ['E'], ['F', 'G'], []),
        ('POT260876', 'Calsheet', 173, 'DEFGHIJKLM', list('GHIJKL'), ['D'], ['F'], ['E'], []),
        ('POT261160', 'PTTDigital_Manday', 73, 'DEFGHIJK', ['G', 'H'], ['D'], [], ['E', 'F'], []),
        ('POT261336', 'DGT_Manday', 40, 'DEFGH', ['F', 'G'], ['D'], [], [], []),
        ('POT261991', 'PTTDigital_Manday', 56, 'DEFGHIJKLMN', ['F', 'G'], ['D'], ['E'], ['I'], ['H']),
        ('POT261467', 'Digital_Manday', 43, 'DEFGH', [], ['D'], ['F'], ['E'], ['G']),
        ('POT254773', 'PTTDigital_Manday', 49, 'DEFGHIJKLM', [], ['D'], [], list('EFGHIJ'), []),
        ('POT261084', 'Digital_Manday', 21, 'DEFGHIJKLMN', [], ['D'], [], [], []),
    ]
    results = []
    for code, name, row, columns, dev, pm, sa, ba, tester in layouts:
        s = sheet(code, name)
        record = {'project': code, 'sheet': name, 'range': f'{columns[0]}{row}:{columns[-1]}{row}',
                  'totalMd': total(s, [f'{c}{row}' for c in columns]), 'roles': {}}
        for label, cols in [('DEV', dev), ('PM', pm), ('SA', sa), ('BA', ba), ('TESTER', tester)]:
            record['roles'][label] = total(s, [f'{c}{row}' for c in cols]) if cols else None
        denominator = record['roles']['DEV']
        record['ratioToDev'] = {k: v / denominator for k, v in record['roles'].items()
                                if k != 'DEV' and v is not None and denominator}
        results.append(record)
    resource = sheet('POT253411', 'Resource')
    smart = {'baselineMd': total(resource, [f'F{r}' for r in range(4, 24)]),
             'commercialMd': total(resource, [f'G{r}' for r in range(4, 24)]),
             'detailMd': sheet('POT253411', 'PTT Digital')['cells']['V60']['value']}
    assert smart['baselineMd'] == resource['cells']['F24']['value']
    assert smart['commercialMd'] == resource['cells']['G24']['value']
    rcp = [b for b in books if b['file'].startswith('POT254773')]
    tables = [next(s for s in b['sheets'] if s['name'] == 'PTTDigital_Manday')['cells'] for b in rcp]
    duplicate = tables[0] == tables[1]
    unchanged = all(hashlib.sha256((ROOT / 'pttdigitalMD' / b['file']).read_bytes()).hexdigest()
                    == b['sha256'] for b in books)
    evidence = {'workbooks': len(books), 'uniquePotCodes': len({b['file'].split('_')[0] for b in books}),
                'primaryTablesRcpIdentical': duplicate, 'allSourceFilesUnchanged': unchanged,
                'smartSearch': smart, 'reviewedAggregates': results,
                'sources': [{'file': b['file'], 'sha256': b['sha256'], 'primarySheet': PRIMARY[b['file'].split('_')[0]]}
                            for b in books]}
    (OUT / 'reviewed-evidence.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in evidence.items() if k != 'sources'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'inventory'
    {'inventory': inventory, 'profile': profile, 'analyze': analyze}[mode]()
