"""Extract explicitly attributed reference values. Never mark imported cards scripted/verified.

Run after import-community.py. Kept local source snapshots are pinned in docs/ASSETS.md.
"""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

root = Path(__file__).resolve().parent.parent
strings = {e.attrib['name']: ''.join(e.itertext()).replace("\\'", "'") for e in ET.parse(root / 'docs/community-strings.local.xml').getroot() if 'name' in e.attrib}
source = {'url': 'https://github.com/eidonia/WowBGAssist/tree/a68e639528069028a98de490602f93a93020a061', 'reference': 'app/src/main/res/values/strings.xml; independent review pending', 'status': 'community'}
names = [('Murloc','murloc',8,4,4),('Gnoll','gnoll',8,4,4),('Ghoul','ghoul',6,3,3),('Crusader','crusader',8,4,4),('Naga','naga',4,2,2),('Spider','spider',4,2,2),('Worgen','worgen',4,2,2),('Wildkin','wildkin',4,1,1),('Ogre','ogre',4,1,1),('Wraith','wraith',6,3,3),('Doomguard','doomguard',2,1,1),('Drake','drake',2,1,1),('Infernal','infernal',2,1,1)]
creatures = []
for key, id, green, red, blue in names:
 image = {'doomguard':'doom_guard'}.get(id,id)
 creatures.append({'id':id,'name':strings[key], 'rule':id, 'stats':{color.lower():{stat.lower():int(strings[key+color+stat]) for stat in ['Threat','Attack','Health']} for color in ['Red','Blue','Green']}, 'stock':{'green':green,'red':red,'blue':blue},'description':strings[key+'Desc'],'image':'/assets/reference/'+image+'_green.png','source':source})
target = root/'src/data/reference-creatures.json'
target.write_text(json.dumps(creatures, ensure_ascii=False, indent=2), encoding='utf8')
cards=[]
for line in (root/'docs/community-database.local.java').read_text(encoding='utf8').splitlines():
 if 'new Stuff(' not in line: continue
 refs=re.findall(r'R.string\.(\w+)',line)
 image=re.search(r'R.drawable\.(\w+)',line)
 if not image or len(refs)<8: continue
 name=refs[0]
 cards.append({'id':image.group(1),'name':strings.get(name,name),'description':strings.get(name+'Desc',''),'level':strings.get(name+'Lvl',''),'price':strings.get(name+'Cost',''),'energy':strings.get(name+'Energy',''),'trait':strings.get(name+'Type',''),'image':'/assets/reference/'+image.group(1)+'.jpg','edition':'unverified','scripted':False,'source':source})
(root/'public/assets/reference-text.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2),encoding='utf8')
chars=json.loads((root/'public/assets/original-characters.json').read_text(encoding='utf-8-sig'))
(root/'src/data/original-characters.json').write_text(json.dumps(chars,ensure_ascii=False,indent=2),encoding='utf8')
print(f'Extracted {len(creatures)} creatures and {len(cards)} reference item records; none promoted to verified base cards.')
