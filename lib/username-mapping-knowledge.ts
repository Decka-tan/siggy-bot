/**
 * USERNAME MAPPING KNOWLEDGE
 * Maps Ritual Names (decorated display names) to clean @usernames
 * This ensures rich mentions work correctly in the UI.
 */

import { KnowledgeEntry } from './siggy-knowledge';

export const USERNAME_MAPPING_KNOWLEDGE: KnowledgeEntry[] = [
  {
    "id": "username-mapping-core",
    "category": "mapping",
    "keywords": ["mapping", "username", "real name", "ritual name", "display name", "format"],
    "content": "CRITICAL NAME FORMATTING RULES:\n" +
      "1) If knowledge shows a Ritual Name with decorations (e.g., 'Name (❖,❖)'), ALWAYS convert it to its clean @username for the response.\n" +
      "2) Rich mentions only work with clean @usernames (lowercase, alphanumeric).\n" +
      "3) MAPPING TABLE:\n" +
      "- linhlambo (❖,❖) -> @linhlambo\n" +
      "- Kash(❖,❖) | NPC LEADER -> @kash_060\n" +
      "- G9D運(❖) -> @g9d_ritual\n" +
      "- Meison (❖❖) -> @meison7554\n" +
      "- Lola (❖❖) -> @lolaritual\n" +
      "- 'vans -> @vans\n" +
      "- joyesh -> @joyesh\n" +
      "- hinata -> @hinata_naruto\n" +
      "- Puresoul -> @puresoul\n" +
      "- Oscar Draws -> @oscar_draws\n" +
      "- livestream -> @livrein\n" +
      "- mjd63 (❖ -> @mjd63\n" +
      "- Rudra (❖ -> @rudra\n" +
      "- SUGARPIC ❖ -> @sugarpic\n" +
      "- 'Orth (❖ -> @orth\n" +
      "- Cwit | (❖ -> @cwit\n" +
      "- El de Pan 🍀❖ -> @eldepan\n" +
      "- Fruckter -> @fruckter\n" +
      "- Santiago -> @santiago\n" +
      "- bottleboiz (❖ -> @bottleboiz\n" +
      "- Kazam❖ -> @kazam\n" +
      "- pince croco (❖ -> @pincecroco\n" +
      "- ! Ylona ❖ -> @ylona\n" +
      "- Val (❖ -> @val\n" +
      "- emmu (❖ -> @emmu\n" +
      "- EREN | DADDY (❖ -> @eren\n" +
      "- zheezzy (❖ -> @zheezzy\n" +
      "- afonso003 (❖ -> @afonso003\n" +
      "- SleepyAvocado (❖ -> @sleepyavocado\n" +
      "- Azaka (❖ -> @azaka\n" +
      "- OfficerPayne (❖ -> @officerpayne\n" +
      "- aNOOBis ❖❖ -> @anoobis\n" +
      "- Perseus -> @perseus\n" +
      "- Kevla -> @kevla\n" +
      "- El Toro -> @eltoro\n" +
      "- Dash(❖ -> @dash\n" +
      "- Hamza -> @hamza\n" +
      "- Oluwasegun (❖ -> @oluwasegun\n" +
      "- Dading  (❖ -> @dading\n" +
      "- Adedayo (Pure Madness) -> @adedayo\n" +
      "- Braddy(Mskillder) -> @braddy\n" +
      "- JericD (❖ -> @jericd\n" +
      "- Ryan -> @ryan\n" +
      "- Blaze_117 -> @blaze_117\n" +
      "- Lina (❖ -> @lina\n" +
      "- BLAZE (❖ -> @blaze\n" +
      "- Luka's : Ritual(❖ -> @lukas\n" +
      "- elijapapi (❖ -> @elijapapi\n" +
      "- rocariedk (❖ -> @rocariedk\n" +
      "- Kundan -> @kundan\n" +
      "- EDWARD (❖ -> @edward\n" +
      "- west -> @west\n" +
      "- ! HariX (❖ -> @harix\n" +
      "- Sαl͢͢͢ϻαn -> @salman\n" +
      "- Boranoona (❖ -> @boranoona\n" +
      "- Mmorgs -> @mmorgs\n" +
      "- KingOPw3 (❖ -> @kingopw3\n" +
      "- BAGHOLDER | THE SIMP (❖ -> @bagholder\n" +
      "- Tella (❖ -> @tella\n" +
      "- LIGHT🚨  🚨 (❖ -> @light\n" +
      "- Rowley -> @rowley\n" +
      "- Keybi (❖ -> @keybi\n" +
      "- coffeedegen (❖ -> @coffeedegen\n" +
      "- fish -> @fish\n" +
      "- X E R 0 -> @xer0\n" +
      "- PRESHYNODE(❖ -> @preshynode\n" +
      "- ZELLA (❖ -> @zella\n" +
      "- Evo Yudha Samael | (❖ -> @evoyudha\n" +
      "- JIRO 멧개 (❖ -> @jiro\n" +
      "- Cutie Flaha | Ritualist -> @cutieflaha\n" +
      "- hdh -> @hdh\n" +
      "- pangpoo (❖ -> @pangpoo\n" +
      "- mido.0826 -> @mido\n" +
      "- lord.luci -> @lordluci\n" +
      "- 0xMyco (❖ -> @myco\n" +
      "- Shanks (❖ -> @shanks\n" +
      "- Sachin -> @sachin\n" +
      "- Hinata (❖ -> @hinata_naruto\n" +
      "- 0xgokdeniz(❖ -> @gokdeniz\n" +
      "- 'swanta iyke (❖ -> @iyke\n" +
      "- assou (❖ -> @assou\n" +
      "- kash(❖ -> @kash_060\n",
    "priority": 20
  }
];
