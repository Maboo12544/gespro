export function moneyToCents(value: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error("Antre yon montan pozitif ak omaksimòm 2 chif apre vigil la.");
  const cents = Math.round(Number(value.trim().replace(",", ".")) * 100);
  if (!Number.isSafeInteger(cents) || cents > 100_000_000) throw new Error("Montan an twò gwo.");
  return cents;
}
export function cashSummary(gross: number, cancelled: number, paid: number, rateBps: number, remitted: number) {
  if (![gross,cancelled,paid,rateBps,remitted].every(n=>Number.isSafeInteger(n)&&n>=0) || cancelled>gross || rateBps>10000) throw new Error("Valè kès yo pa valab.");
  const net=gross-cancelled;
  const commission=Math.round(net*rateBps/10000);
  const due=net-commission-paid;
  return {gross,cancelled,net,paid,commission,remitted,due,balance:due-remitted};
}
