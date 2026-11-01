# 1,741市区町村に人口（住民基本台帳 令和8年1月1日）を付けて、人口の多い順に並べる
import sys, csv, json, openpyxl
xlsx, muni_csv, out = sys.argv[1:4]
wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
pop = {}
for row in wb.worksheets[0].iter_rows(values_only=True):
    if row and row[0] and str(row[0]).isdigit() and len(str(row[0])) == 6 and isinstance(row[5], (int, float)):
        pop[str(row[0])] = int(row[5])
munis = []
with open(muni_csv, encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        code = r['lgcode'].strip().zfill(6)
        munis.append({'code': code, 'pref': r['pref'], 'name': r['city'], 'kana': r['citykana'], 'url': r['url'], 'pop': pop.get(code)})
# 政令市の区（localgovjp に入っていれば）を除くのは gen-municipalities と同じ規則に合わせる
sys.path.insert(0, '')
known = [m for m in munis]
missing = [m for m in known if m['pop'] is None]
print('total', len(known), 'missing pop', len(missing), [m['name'] for m in missing][:20], file=sys.stderr)
known.sort(key=lambda m: -(m['pop'] or 0))
json.dump(known, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('top10', [(m['name'], m['pop']) for m in known[:10]], file=sys.stderr)
cum = 0; total = sum(m['pop'] or 0 for m in known)
for n in (50, 100, 200, 300, 500, 800, 1200):
    print(n, round(sum(m['pop'] or 0 for m in known[:n]) / total * 100, 1), '%', file=sys.stderr)
