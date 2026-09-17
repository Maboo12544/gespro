export type Language='ht'|'fr'|'en'|'es';
export const languageNames={ht:'Kreyòl',fr:'Français',en:'English',es:'Español'};
const rows=`Lang|Langue|Language|Idioma
Sove chanjman|Enregistrer|Save changes|Guardar cambios
Anile|Annuler|Cancel|Cancelar
Configuration|Configuration|Configuration|Configuración
Monitoring|Suivi|Monitoring|Monitoreo
MONITORING|SUIVI|MONITORING|MONITOREO
Pending for payment|Paiements en attente|Pending payments|Pagos pendientes
Sales history|Historique des ventes|Sales history|Historial de ventas
Print report|Imprimer le rapport|Print report|Imprimir informe
Duplicate|Dupliquer|Duplicate|Duplicar
Play monitor|Suivi des jeux|Play monitor|Monitor de jugadas
Pay|Payer|Pay|Pagar
View sales|Voir les ventes|View sales|Ver ventas
Schedules|Horaires|Schedules|Horarios
Help|Aide|Help|Ayuda
Authorize strikeout|Autoriser l’annulation|Authorize cancellation|Autorizar cancelación
Random plays generator|Générateur de numéros|Random plays generator|Generador de jugadas
Logout|Déconnexion|Log out|Cerrar sesión
Tableau de bord|Tableau de bord|Dashboard|Panel
Kès ak komisyon|Caisse et commissions|Cash and commissions|Caja y comisiones
Tablo bank|Tableau de la banque|Bank dashboard|Panel de banca
Administratè|Administrateurs|Administrators|Administradores
PDV Transactions|Transactions PDV|POS transactions|Transacciones PDV
Pwen vant|Points de vente|Points of sale|Puntos de venta
Pwen Vant|Point de vente|Point of sale|Punto de venta
Lotri|Loterie|Lottery|Lotería
Rezilta tiraj|Résultats des tirages|Draw results|Resultados de sorteos
Piblikasyon tiraj|Publication des tirages|Publish results|Publicar resultados
Paramèt|Paramètres|Settings|Ajustes
Mèt Bòlèt|Propriétaire|Bank owner|Propietario
Sipèvizè|Superviseur|Supervisor|Supervisor
Vandè|Vendeur|Seller|Vendedor
VANDÈ|VENDEUR|SELLER|VENDEDOR
Bank|Banque|Bank|Banca
Boul|Numéro|Number|Número
Montan|Montant|Amount|Importe
Montan pou chak boul|Montant par numéro|Amount per number|Importe por número
Balans Vandè|Solde vendeur|Seller balance|Saldo del vendedor
Rafrechi|Actualiser|Refresh|Actualizar
Jwèt:|Jeux :|Plays:|Jugadas:
AJOUTE|AJOUTER|ADD|AGREGAR
KREYE TIKÈ|CRÉER LE TICKET|CREATE TICKET|CREAR BOLETO
Duplike|Dupliquer|Duplicate|Duplicar
Enprime|Imprimer|Print|Imprimir
Peye|Payer|Pay|Pagar
Èd|Aide|Help|Ayuda
JWÈT YO|JEUX|PLAYS|JUGADAS
jwèt|jeux|plays|jugadas
Nimewo|Numéro|Number|Número
Aksyon|Action|Action|Acción
Pa gen jwèt ankò|Aucun jeu|No plays yet|No hay jugadas
Antre yon nimewo pou ajoute.|Saisissez un numéro à ajouter.|Enter a number to add.|Ingrese un número para agregar.
Tikè|Ticket|Ticket|Boleto
Lavant|Ventes|Sales|Ventas
Dat|Date|Date|Fecha
Lè|Heure|Time|Hora
Jou|Jour|Day|Día
Estati|Statut|Status|Estado
Gayan|Gagnant|Winner|Ganador
Pèdi|Perdant|Loser|Perdedor
An atant|En attente|Pending|Pendiente
Anrejistre|Enregistré|Recorded|Registrado
Tout|Tous|All|Todos
Chèche|Rechercher|Search|Buscar
Rechèch|Recherche|Search|Búsqueda
Dat kòmansman|Date de début|Start date|Fecha inicial
Dat fen|Date de fin|End date|Fecha final
Total lavant|Total des ventes|Total sales|Ventas totales
Total pri|Total des gains|Total prizes|Premios totales
Peman annatant|Paiements en attente|Pending payments|Pagos pendientes
Enprime peman annatant|Imprimer les paiements en attente|Print pending payments|Imprimir pagos pendientes
Pa gen tikè pou rechèch sa a.|Aucun ticket trouvé.|No tickets found.|No se encontraron boletos.
Detay tikè|Détails du ticket|Ticket details|Detalles del boleto
Delè anilasyon:|Délai d’annulation :|Cancellation deadline:|Plazo de cancelación:
Konfime anilasyon|Confirmer l’annulation|Confirm cancellation|Confirmar cancelación
Anile fich sa a?|Annuler ce ticket ?|Cancel this ticket?|¿Cancelar este boleto?
Pa gen fich ankò|Aucun ticket|No tickets yet|No hay boletos
Rezime lavant —|Résumé des ventes —|Sales summary —|Resumen de ventas —
Done sesyon sa a konekte sou sèvè a.|Données de cette session connectées au serveur.|Session data is connected to the server.|Datos de esta sesión conectados al servidor.
Total pa lotri|Totaux par loterie|Totals by lottery|Totales por lotería
Total vann|Total vendu|Total sold|Total vendido
Pa gen lavant pou dat sa a.|Aucune vente à cette date.|No sales for this date.|No hay ventas para esta fecha.
Tikè genyen|Tickets gagnants|Winning tickets|Boletos ganadores
Nimewo tikè|Numéro du ticket|Ticket number|Número de boleto
Pri|Gain|Prize|Premio
Pa gen tikè genyen pou dat sa a.|Aucun ticket gagnant à cette date.|No winning tickets for this date.|No hay boletos ganadores para esta fecha.
Nimewo genyen|Numéros gagnants|Winning numbers|Números ganadores
Rezilta tiraj yo poko konekte nan rapò sa a.|Les résultats ne sont pas encore connectés.|Draw results are not connected yet.|Los resultados aún no están conectados.
Tranzaksyon resan|Transactions récentes|Recent transactions|Transacciones recientes
Lavant|Ventes|Sales|Ventas
Pa gen tranzaksyon pou dat sa a.|Aucune transaction à cette date.|No transactions for this date.|No hay transacciones para esta fecha.
VIEW SALES|VOIR LES VENTES|VIEW SALES|VER VENTAS
Lavant ak rapò pwen vant lan|Ventes et rapports du point de vente|POS sales and reports|Ventas e informes del punto de venta
Wè lavant|Voir les ventes|View sales|Ver ventas
Enprime rapò|Imprimer le rapport|Print report|Imprimir informe
Sales|Ventes|Sales|Ventas
Transactions|Transactions|Transactions|Transacciones
Kalite|Type|Type|Tipo
Referans|Référence|Reference|Referencia
Total tikè|Total des tickets|Total tickets|Total de boletos
Lavant (san tikè anile)|Ventes hors tickets annulés|Sales excluding cancelled tickets|Ventas sin boletos cancelados
Komisyon|Commission|Commission|Comisión
Pa konfigire|Non configuré|Not configured|Sin configurar
Pri genyen|Gains|Prizes won|Premios ganados
Balans inisyal / final|Solde initial / final|Opening / closing balance|Saldo inicial / final
Pa konekte|Non connecté|Not connected|Sin conexión
Retounen|Retour|Back|Volver
Balans|Solde|Balance|Saldo
Sòti nan bank|Quitter la banque|Exit bank|Salir de la banca
Limit jwèt|Limites des jeux|Game limits|Límites de juegos
Peman pa kalite jwèt|Paiements par jeu|Payouts by game|Pagos por juego
Kalite jwèt|Type de jeu|Game type|Tipo de juego
Non konplè|Nom complet|Full name|Nombre completo
Non lotri a|Nom de la loterie|Lottery name|Nombre de lotería
Kreye kont lan|Créer le compte|Create account|Crear cuenta
Kreye Mèt Bòlèt|Créer un propriétaire|Create bank owner|Crear propietario
Kreye yon Mèt Bòlèt|Créer un propriétaire|Create a bank owner|Crear un propietario
DÈNYE 7 JOU|7 DERNIERS JOURS|LAST 7 DAYS|ÚLTIMOS 7 DÍAS
Aktivite lavant|Activité des ventes|Sales activity|Actividad de ventas
Estati tikè yo|Statut des tickets|Ticket status|Estado de boletos
Tikè total|Total des tickets|Total tickets|Total de boletos
Dènye tikè yo|Tickets récents|Recent tickets|Boletos recientes
Wè tout →|Voir tout →|View all →|Ver todo →
Pare|Prêt|Ready|Listo
Pa aktive|Non activé|Not activated|No activado
Chwazi tout|Tout sélectionner|Select all|Seleccionar todo
Deseleksyone tout|Tout désélectionner|Deselect all|Deseleccionar todo
Modifye|Modifier|Edit|Editar
Retire|Retirer|Remove|Quitar
Anile chanjman|Annuler les modifications|Cancel changes|Cancelar cambios
Valide tarif yo|Valider les tarifs|Save rates|Guardar tarifas`;
export const translations:Record<string,string[]>={};for(const line of rows.split('\n')){const values=line.split('|');translations[values[0]]=values}
export function translate(text:string,language:Language){const key=text.trim(),values=translations[key];return values?text.replace(key,values[{ht:0,fr:1,en:2,es:3}[language]]):text}
const extra=`Fòma boul la pa valab.|Format du numéro invalide.|Invalid number format.|Formato de número no válido.
Antre yon boul ak yon montan ki valab.|Saisissez un numéro et un montant valides.|Enter a valid number and amount.|Ingrese un número y un importe válidos.
Ajoute omwen yon jwèt anvan ou kreye tikè a.|Ajoutez au moins un jeu avant de créer le ticket.|Add at least one play before creating a ticket.|Agregue al menos una jugada antes de crear el boleto.
Pa gen tikè pou duplike.|Aucun ticket à dupliquer.|No ticket to duplicate.|No hay boleto para duplicar.
De boul pè pa valab pou maryaj ak revè.|Deux doubles ne sont pas valides pour un mariage inversé.|Two doubles are invalid for a reversed pair.|Dos dobles no son válidos para una pareja invertida.
Chwazi yon peryòd dat ki valab.|Choisissez une période valide.|Choose a valid date range.|Elija un periodo válido.
Anilasyon refize: delè a pase oswa estati tikè a chanje.|Annulation refusée : délai expiré ou statut modifié.|Cancellation refused: deadline passed or status changed.|Cancelación rechazada: plazo vencido o estado cambiado.
Vann pa|Vendu par|Sold by|Vendido por
Dat anilasyon|Date d’annulation|Cancellation date|Fecha de cancelación
Dat peman|Date du paiement|Payment date|Fecha de pago
Peye pa|Payé par|Paid by|Pagado por
Anile pa|Annulé par|Cancelled by|Cancelado por
Peye|Payé|Paid|Pagado
Tikè ak lavant yo konekte sou sèvè a. Rafrechi paj la pou wè dènye done yo.|Les tickets et ventes sont connectés au serveur. Actualisez pour voir les dernières données.|Tickets and sales are connected to the server. Refresh to see latest data.|Los boletos y ventas están conectados al servidor. Actualice para ver los últimos datos.
Balans ak tranzaksyon kès yo konekte sou sèvè a. Lis anba a montre lavant yo.|Les soldes et transactions de caisse sont connectés. Les ventes figurent ici.|Cash balances and transactions are connected to the server. Sales appear here.|Los saldos y transacciones de caja están conectados. Las ventas aparecen aquí.
Tikè ak lavant pwen vant lan|Tickets et ventes du point de vente|POS tickets and sales|Boletos y ventas del punto de venta`;
for(const line of extra.split('\n')){const values=line.split('|');translations[values[0]]=values}
