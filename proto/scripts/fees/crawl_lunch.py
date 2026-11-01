# 市区町村の公式サイトをたどって、学校給食費（とくに中学校の無償化）のページ・文書の候補を集める。crawl.py の給食版。
#   python3 -I crawl.py <munis_by_pop.json> <開始の順位(0から)> <終わりの順位(含まない)> <出力フォルダ> [並列数]
# 出力: <出力フォルダ>/<code>/index.json と docs/NN.txt（文字だけ。PDF・Excel の元のファイルは読んだら消す）
# 1つのサイトには順番に（間を空けて）アクセスする。robots.txt で止められているURLには行かない。
import json, os, re, sys, time, subprocess, threading, traceback, socket
socket.setdefaulttimeout(15)
import urllib.request, urllib.parse, urllib.robotparser, urllib.error
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 sumugacha-research'
DELAY = 0.4          # 同じサイトへのアクセスの間隔（秒）
MAX_PAGES = 60       # 1つの市区町村で読むページの上限
MAX_DOCS = 5         # 落とす文書（PDFなど）の上限
TMPDIR = '/tmp/claude-0/-home-user-test/f7632ef6-fec1-5705-b5b8-c4efbe3f1fdd/scratchpad/fees/curltmp-lunch'
DOC_GOOD = ['給食費', '無償', '無料', '月額', '負担', '補助', 'お知らせ', '保護者']
DOC_BAD = ['献立', 'こんだて', 'メニュー', 'レシピ', 'アレルギー', '食材', '放射', '申請書', '様式', '記入例', '口座', '委任状', '入札', '調理', '衛生']
MAX_BYTES = 12_000_000
TIMEOUT = 20

STRONG = ['給食費', '学校給食', '給食の無償', '給食無償', '給食費無償', 'kyushoku', 'kyuushoku', 'kyusyoku', 'kyuusyoku']
MEDIUM = ['サイトマップ', 'sitemap', '給食', '教育委員会', '学校教育', '小学校', '中学校', '小・中学校', '小中学校', '無償化', '就学', 'kyoiku', 'gakko', 'gakkou', 'kyouiku']
WEAK = ['子育て', '子ども', 'こども', '子供', '教育', '学校', 'kosodate', 'kodomo', 'くらし', '暮らし', 'life']
NEG = ['議会', '入札', '観光', 'ごみ', '選挙', '/en/', '/english', '/zh', '/ko/', 'foreign', 'calendar', 'event', 'イベント', '求人', '採用', '職員', '例規', '広報', 'kouhou', 'koho', '統計', '地図', 'map', 'facebook', 'twitter', 'instagram', 'youtube', 'line.me', 'mailto:', 'javascript:', 'tel:']
DOC_EXT = ('.pdf', '.xlsx', '.xls', '.docx', '.doc', '.csv')


class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links, self._href, self._text, self.title, self._in_title = [], None, [], '', False
        self.text = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self._href = dict(attrs).get('href')
            self._text = []
        elif tag == 'title':
            self._in_title = True
        elif tag in ('br', 'p', 'tr', 'li', 'div', 'h1', 'h2', 'h3', 'h4', 'table'):
            self.text.append('\n')
        elif tag in ('td', 'th'):
            self.text.append('\t')

    def handle_endtag(self, tag):
        if tag == 'a' and self._href is not None:
            self.links.append((self._href, ''.join(self._text).strip()))
            self._href = None
        elif tag == 'title':
            self._in_title = False

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
        if self._in_title:
            self.title += data
        self.text.append(data)


def decode(raw, ctype):
    cs = None
    m = re.search(r'charset=([\w\-]+)', ctype or '', re.I)
    if m:
        cs = m.group(1)
    if not cs:
        m = re.search(rb'<meta[^>]+charset=["\']?([\w\-]+)', raw[:4000], re.I)
        if m:
            cs = m.group(1).decode('ascii', 'ignore')
    for c in [cs, 'utf-8', 'cp932', 'euc_jp']:
        if not c:
            continue
        c = {'shift_jis': 'cp932', 'sjis': 'cp932', 'x-sjis': 'cp932', 'windows-31j': 'cp932'}.get(c.lower(), c)
        try:
            return raw.decode(c)
        except Exception:
            continue
    return raw.decode('utf-8', 'ignore')


def score(url, text):
    s = (url + ' ' + text)
    low = s.lower()
    if any(n.lower() in low for n in NEG):
        return -1
    v = 0
    for k in STRONG:
        if k.lower() in low:
            v += 10
    for k in MEDIUM:
        if k.lower() in low:
            v += 4
    for k in WEAK:
        if k.lower() in low:
            v += 1
    return v


def years(text):
    out = set()
    for m in re.finditer(r'令和\s*([0-9０-９]+)\s*年度', text):
        out.add('R' + m.group(1).translate(str.maketrans('０１２３４５６７８９', '0123456789')))
    for m in re.finditer(r'(20[2-3][0-9])\s*年度', text):
        out.add(m.group(1))
    return sorted(out)


class Site:
    def __init__(self, start):
        self.start = start
        self.hosts = set()
        self.last = 0.0
        self.robots = {}
        self.add_host(urllib.parse.urlparse(start).netloc)

    def add_host(self, host):
        base = host[4:] if host.startswith('www.') else host
        self.hosts.update({host, base})
        self.host = host
        self.base_host = base

    def robots_for(self, url):
        # robots.txt は curl で取る。200 の文字のファイルのときだけ従う（404・403・HTMLなどは「決まりなし」とみなす）
        pr = urllib.parse.urlparse(url)
        key = pr.netloc
        if key not in self.robots:
            rp = None
            try:
                final, ctype, data = self.get(f'{pr.scheme}://{key}/robots.txt', 500_000)
                if 'text/plain' in (ctype or '').lower():
                    rp = urllib.robotparser.RobotFileParser()
                    rp.parse(data.decode('utf-8', 'ignore').splitlines())
            except Exception:
                rp = None
            self.robots[key] = rp
        return self.robots[key]

    def allowed(self, url):
        rp = self.robots_for(url)
        if rp is None:
            return True
        try:
            return rp.can_fetch(UA, url)
        except Exception:
            return True

    def same(self, url):
        h = urllib.parse.urlparse(url).netloc
        return any(h == x or h.endswith('.' + x) for x in self.hosts)

    def get(self, url, limit=MAX_BYTES):
        if url.startswith('http://'):
            url = 'https://' + url[len('http://'):]
        wait = self.last + DELAY - time.time()
        if wait > 0:
            time.sleep(wait)
        self.last = time.time()
        import tempfile
        fd, tpath = tempfile.mkstemp(prefix='c', dir=TMPDIR)
        os.close(fd)
        try:
            r = subprocess.run(['curl', '-sL', '--compressed', '-A', UA, '-H', 'Accept-Language: ja,en;q=0.5', '--max-time', str(TIMEOUT),
                                '--max-filesize', str(limit), '-o', tpath, '-w', '%{url_effective}\\n%{content_type}\\n%{http_code}', url],
                               capture_output=True, timeout=TIMEOUT + 10)
            meta = r.stdout.decode('utf-8', 'ignore').split('\n')
            final, ctype, code = (meta + ['', '', ''])[:3]
            if r.returncode != 0 or not code.startswith('2'):
                raise IOError(f'curl rc={r.returncode} http={code}')
            data = open(tpath, 'rb').read(limit)
            return final or url, ctype, data
        finally:
            if os.path.exists(tpath):
                os.remove(tpath)


def extract_doc(path, kind):
    try:
        if kind == '.pdf':
            out = subprocess.run(['pdftotext', '-layout', '-l', '30', path, '-'], capture_output=True, timeout=60)
            return out.stdout.decode('utf-8', 'ignore')
        if kind in ('.xlsx',):
            import openpyxl
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
            lines = []
            for ws in wb.worksheets[:6]:
                lines.append(f'## sheet {ws.title}')
                for row in ws.iter_rows(values_only=True):
                    vals = ['' if v is None else str(v) for v in row]
                    if any(vals):
                        lines.append('\t'.join(vals))
            return '\n'.join(lines)
        if kind == '.csv':
            raw = open(path, 'rb').read()
            return decode(raw, '')
    except Exception as e:
        return f'[extract error {e}]'
    return ''


def crawl(m, outroot):
    code = m['code']
    out = os.path.join(outroot, code)
    ip = os.path.join(out, 'index.json')
    if os.path.exists(ip):
        try:
            if (json.load(open(ip, encoding='utf-8')).get('pages_read') or 0) > 3:
                return code, 'skip'
        except Exception:
            pass
    os.makedirs(os.path.join(out, 'docs'), exist_ok=True)
    tmp = os.path.join(out, 'tmp')
    os.makedirs(tmp, exist_ok=True)
    start = m['url'] or ''
    index = {'code': code, 'pref': m['pref'], 'name': m['name'], 'start': start, 'pages': [], 'docs': [], 'errors': []}
    if not start.startswith('http'):
        index['errors'].append('no start url')
        json.dump(index, open(os.path.join(out, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        return code, 'nourl'
    site = Site(start)
    root = urllib.parse.urlunparse(urllib.parse.urlparse(start)._replace(path='/', params='', query='', fragment=''))
    seen, queue, pages, docs = set(), [(100, 0, start, 'start'), (99, 0, root, 'root')], 0, 0
    try:
        _, _, sm = site.get(urllib.parse.urljoin(root, '/sitemap.xml'), 5_000_000)
        for u in re.findall(rb'<loc>\s*([^<\s]+)\s*</loc>', sm)[:20000]:
            u = u.decode('utf-8', 'ignore')
            lu = u.lower()
            if any(k in lu for k in ['hoikuryo', 'hoikuryou', 'futan', 'hoiku']) and site.same(u):
                queue.append((30, 1, u, 'sitemap.xml'))
    except Exception:
        pass
    doc_cands = {}
    t0 = time.time()
    while queue and pages < MAX_PAGES and time.time() - t0 < 600:
        queue.sort(key=lambda x: -x[0])
        sc, depth, url, anchor = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        if not site.allowed(url):
            index['errors'].append(f'robots: {url}')
            continue
        try:
            final, ctype, raw = site.get(url, 3_000_000)
        except Exception as e:
            index['errors'].append(f'{type(e).__name__}: {url}')
            continue
        pages += 1
        fh = urllib.parse.urlparse(final).netloc
        if pages == 1 and fh and not site.same(final):
            site.add_host(fh)
        if 'html' not in ctype and not raw[:200].lstrip().lower().startswith((b'<!doctype', b'<html')):
            continue
        html = decode(raw, ctype)
        p = Links()
        try:
            p.feed(html)
        except Exception:
            pass
        title = re.sub(r'\s+', ' ', p.title).strip()
        text = re.sub(r'[ \t　]+', ' ', ''.join(p.text))
        text = re.sub(r'\n\s*\n+', '\n', text)
        page_score = score(final, title)
        rec = {'url': final, 'title': title[:120], 'score': page_score, 'depth': depth, 'years': years(text[:20000])}
        index['pages'].append(rec)
        # 保育料のページらしければ、本文も候補として残す
        if ('給食' in title and any(k in title for k in ['費', '無償', '無料', '負担'])) or ('給食費' in text and any(k in text for k in ['無償', '無料', '月額', '保護者負担'])):
            n = len(index['docs'])
            fn = f'docs/{n:02d}.txt'
            open(os.path.join(out, fn), 'w', encoding='utf-8').write(f'# {title}\n# {final}\n' + text[:250000])
            index['docs'].append({'kind': 'page', 'url': final, 'anchor': title, 'file': fn, 'chars': len(text), 'years': rec['years']})
        for href, atext in p.links:
            if not href:
                continue
            u = urllib.parse.urljoin(final, href.strip()).split('#')[0]
            if u.startswith('http://'):
                u = 'https://' + u[len('http://'):]
            if not u.startswith('http') or not site.same(u):
                continue
            lowu = u.lower()
            s = score(u, atext)
            if s < 0:
                continue
            if lowu.endswith(DOC_EXT) or any(lowu.endswith(e + '?') for e in DOC_EXT):
                ds = score(u, atext + ' ' + title)
                blob = atext + ' ' + u
                ds += 8 * sum(1 for k in DOC_GOOD if k in blob) - 8 * sum(1 for k in DOC_BAD if k in blob)
                strongish = ('給食' in (atext + title) and any(k in (atext + title) for k in ['費', '無償', '無料', '負担', '補助'])) or any(k in u.lower() for k in ['kyushokuhi', 'kyuushokuhi', 'kyusyokuhi', 'mushou'])
                if strongish:
                    doc_cands[u] = max(doc_cands.get(u, (0, ''))[0], ds), (atext or title)[:120]
                continue
            if depth < 5 and u not in seen and s > 0:
                queue.append((s - depth, depth + 1, u, atext[:80]))
    # 文書を落として文字にする（点数の高い順）
    for u, (s, anchor) in sorted(doc_cands.items(), key=lambda kv: -kv[1][0])[:MAX_DOCS]:
        if not site.allowed(u):
            continue
        ext = next((e for e in DOC_EXT if u.lower().split('?')[0].endswith(e)), '.pdf')
        tpath = os.path.join(tmp, f'd{len(index["docs"]):02d}{ext}')
        try:
            final, ctype, raw = site.get(u)
            open(tpath, 'wb').write(raw)
            text = extract_doc(tpath, ext)
        except Exception as e:
            index['errors'].append(f'doc {type(e).__name__}: {u}')
            continue
        finally:
            if os.path.exists(tpath):
                os.remove(tpath)
        n = len(index['docs'])
        fn = f'docs/{n:02d}.txt'
        open(os.path.join(out, fn), 'w', encoding='utf-8').write(f'# {anchor}\n# {u}\n' + text[:250000])
        index['docs'].append({'kind': ext[1:], 'url': u, 'anchor': anchor, 'file': fn, 'chars': len(text), 'years': years(text[:50000]), 'score': s, 'image_only': len(text.strip()) < 80})
    try:
        os.rmdir(tmp)
    except Exception:
        pass
    index['pages_read'] = pages
    index['seconds'] = round(time.time() - t0, 1)
    json.dump(index, open(os.path.join(out, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return code, f"pages={pages} docs={len(index['docs'])}"


def main():
    src, a, b, outroot = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    workers = int(sys.argv[5]) if len(sys.argv) > 5 else 24
    munis = json.load(open(src, encoding='utf-8'))[a:b]
    os.makedirs(outroot, exist_ok=True)
    os.makedirs(TMPDIR, exist_ok=True)
    lock = threading.Lock()
    done = [0]

    def run(m):
        try:
            r = crawl(m, outroot)
        except Exception:
            r = (m['code'], 'error ' + traceback.format_exc(limit=1).replace('\n', ' ')[:200])
        with lock:
            done[0] += 1
            print(f"[{done[0]}/{len(munis)}] {m['name']} {r[1]}", flush=True)

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(run, munis))


if __name__ == '__main__':
    main()
