# Návrh listů v Google Sheets

Pro rychlé zprovoznění backend používá technický list:

- `AppState`

Ten slouží jen pro uložení celého JSON stavu aplikace.

## Minimální nutný list pro běh aplikace

### `AppState`

| Sloupec | Význam |
| --- | --- |
| `A` | klíč |
| `B` | hodnota |

Použitý řádek:

- `A2 = appState`
- `B2 = celý JSON stav aplikace`

Backend si tento list umí vytvořit sám, pokud má oprávnění k zápisu do sešitu.

## Doporučené budoucí pracovní listy

Pokud budete chtít později přejít z jednoho JSON blobu na čitelnější tabulkovou strukturu, doporučuji tyto listy:

- `Rodiny`
- `Osobni_udaje`
- `Zajemci`
- `Smlouvy`
- `Vstup`
- `Plany_IP`
- `Cile_IP`
- `Hodnoceni_IP`
- `Intervence`
- `KA3_Aktivity`
- `KA3_Ucast`
- `Vystup`
- `Ukonceni`
- `Pracovnici`
- `Vzdelavani`
- `Supervize`
- `Projektove_metriky`

## Doporučení k právům

Google Sheet nasdílejte na e-mail service accountu jako:

- `Editor`

Bez toho backend nebude umět zapisovat.
