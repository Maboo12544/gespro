export type PaperWidth='58'|'80'|'a4';
export function printerPaper():PaperWidth{
 try{const value=localStorage.getItem('gespro-printer-paper');if(value==='58'||value==='a4')return value}catch{}
 return '80';
}
export function applyPrinterPaper(value:PaperWidth){
 const width=value==='58'?'48mm':'72mm';
 document.documentElement.style.setProperty('--receipt-paper-width',width);
}
export function savePrinterPaper(value:PaperWidth){
 try{localStorage.setItem('gespro-printer-paper',value)}catch{}
 applyPrinterPaper(value);
}
