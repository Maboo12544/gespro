# Plan sekirite GesPro — pou pita

## Mizajou otorizasyon

Itilizatè a mande kontinye devlopman an demonstrasyon sèlman, san lajan reyèl. Kès, komisyon ak fèmti jounen yo ajoute kòm simulation ki rete nan sesyon an. Nouvo koneksyon tranzaksyon reyèl, bank reyèl ak peman rete an poz. Login ki deja egziste konsève.

## Enstriksyon itilizatè a

2026-09-15: « Poko Conecte anyen save tout sa yo Pou li Devan ».
Sove plan an sèlman. Pa konekte nouvo fonksyon, pa aktive vant reyèl, pa chanje bazdone oswa pibliye chanjman pou plan sa a. Tann nouvo enstriksyon itilizatè a anvan aplikasyon. Konsève aparans ekran yo.

## Sa ki deja fèt

Kont Super Admin Gespro123 aktive; itilizatè a konfime li konekte. Fondasyon bank, pwofil, wòl ak separasyon aksè egziste nan Supabase. Ekran vant ak konfigirasyon yo toujou sèvi ak done demonstrasyon; login reyèl pa vle di sistèm vant lan pare pou lajan reyèl.

## Lòd travay lè itilizatè a mande reprann

1. Konekte bank ak dwa aksè: mèt bòlèt sèlman bank pa li; sipèvizè sèlman pwen vant yo ba li; vandè pa modifye payout, limit, rezilta oswa dwa aksè. Verifye separasyon bank ak kont dezaktive sou sèvè ak bazdone, pa sèlman nan ekran.
2. Verifye chak vant sou sèvè: tiraj ouvè, lè fèmti sèvè, boul bloke, limit pa lotri/jwèt/jou/nimewo ak dimansyon bank/sipèvizè/vandè. Tranzaksyon atomik pou de vant similtane pa depase limit.
3. Tikè: nimewo inik; idempotans pou doub klik ak rekoneksyon; konsève boul, montan ak payout ki te aplikab lè vant lan fèt. Pa gen chanjman an kachèt apre konfimasyon.
4. Anilasyon ak peman: delè anilasyon verifye sou sèvè; kenbe tikè anile nan istorik; anpeche doub peman; re-enprime pa kreye yon lòt vant. Tcheke dwa aksè chak aksyon.
5. Tras aksyon: aktè, bank, lè, valè anvan/apre pou limit, payout, rezilta, dwa aksè ak peman. Sipò Super Admin nan bank rete atribiye a Super Admin, san mande modpas mèt bank. Pwoteje istorik kont modifikasyon pa itilizatè òdinè.
6. Pwoteksyon kont ak siveyans: dezyèm verifikasyon administratè, kontwòl tantativ koneksyon, revokasyon sesyon, alèt aktivite sispèk, sovgad ak tès restorasyon. Verifye kapasite ak pri sèvis yo anvan nenpòt angajman.

## Verifikasyon anvan lajan reyèl

Teste aksè kwaze ant bank, elevasyon privilèj, kont bloke, vant similtane, limit ak lè fèmti, tantativ doub vant/doub peman, delè anilasyon, koreksyon rezilta ak tras aksyon, epi restorasyon done. Pa deklare sistèm nan san fwod oswa 100% an sekirite; rapòte sa ki teste ak sa ki poko fèt.
