// EAN-13 / EAN-8 エンコーダ検証スクリプト
//
// index.html に埋め込んでいるエンコーダと同一のロジックで生成したモジュール列を
// ZXing のデコーダに読ませ、元のコードに戻ることを確認する。
//
//   npm install @zxing/library@0.20.0
//   node tools/verify_ean13.js
const ZXing = require('@zxing/library');

/* ---- index.html と同一のエンコーダ ---- */
const EAN_L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const EAN_PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function eanR(d){ return EAN_L[d].replace(/[01]/g, c => c === '0' ? '1' : '0'); }
function eanG(d){ return eanR(d).split('').reverse().join(''); }
function eanCheckDigit(body){
  let sum = 0;
  for (let i = 0; i < body.length; i++){
    const n = body.charCodeAt(i) - 48;
    sum += ((body.length - i) % 2 === 1) ? n * 3 : n;
  }
  return String((10 - (sum % 10)) % 10);
}
function eanModules(code){
  if (/^\d{13}$/.test(code)){
    if (eanCheckDigit(code.slice(0, 12)) !== code[12]) return null;
    const d = code.split('').map(Number);
    const parity = EAN_PARITY[d[0]];
    let m = '101';
    for (let i = 1; i <= 6; i++) m += parity[i - 1] === 'L' ? EAN_L[d[i]] : eanG(d[i]);
    m += '01010';
    for (let i = 7; i <= 12; i++) m += eanR(d[i]);
    return m + '101';
  }
  if (/^\d{8}$/.test(code)){
    if (eanCheckDigit(code.slice(0, 7)) !== code[7]) return null;
    const d = code.split('').map(Number);
    let m = '101';
    for (let i = 0; i < 4; i++) m += EAN_L[d[i]];
    m += '01010';
    for (let i = 4; i < 8; i++) m += eanR(d[i]);
    return m + '101';
  }
  return null;
}
/* ---- ここまで ---- */

// モジュール列を輝度ビットマップにラスタライズして ZXing でデコード
function decodeModules(m){
  const quiet = 12, scale = 4;
  const width = (m.length + quiet * 2) * scale, height = 40;
  const lum = new Uint8ClampedArray(width * height);
  lum.fill(255);
  for (let i = 0; i < m.length; i++){
    if (m[i] === '1'){
      for (let s = 0; s < scale; s++){
        const x = (quiet + i) * scale + s;
        for (let y = 0; y < height; y++) lum[y * width + x] = 0;
      }
    }
  }
  const src = new ZXing.RGBLuminanceSource(lum, width, height);
  const bmp = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(src));
  const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8]]]);
  return new ZXing.MultiFormatReader().decode(bmp, hints).getText();
}

const cases = [
  // デモ商品の店内コード（GS1 店内用プレフィックス 20）
  '2000000000015', '2000000000022', '2000000000039', '2000000000046',
  // 一般的な JAN/EAN
  '4006381333931', '4901234567894', '4909411083816',
  // EAN-8
  '96385074', '20000004', '49123456'
];
let ok = true;
for (const c of cases){
  const m = eanModules(c);
  if (!m){ console.log(c, 'INVALID (check digit)'); ok = false; continue; }
  const dec = decodeModules(m);
  console.log(c, dec === c ? 'OK' : 'FAIL got ' + dec);
  if (dec !== c) ok = false;
}
console.log(ok ? 'ALL PASS' : 'FAILURES PRESENT');
process.exit(ok ? 0 : 1);
