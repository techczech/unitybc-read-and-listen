"""Build the public reader from fixed Markdown, without model/provider calls."""
from pathlib import Path
import copy, html, json, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = {'en':'English','bn':'বাংলা Bengali','ur':'اردو Urdu','gu':'ગુજરાતી Gujarati','cs':'Čeština Czech'}
MATERIALS = {'lay-summary':'Plain language summary','pis':'Participant information','questionnaire':'Questionnaire examples'}
COPY=json.loads((ROOT/'source/companion-copy.md').read_text().split('---',2)[1])

def read_material(path):
    return json.loads(path.read_text().split('---', 2)[1])

def page_name(language, material):
    return 'index.html' if (language, material)==('en','lay-summary') else f'{language}-{material}.html'

def navigation(language, material):
    langs=''.join(f'<a href="/{page_name(code,material)}" data-language-code="{code}"'+(' aria-current="page"' if code==language else '')+f'>{name}</a>' for code,name in LANGUAGES.items())
    docs=''.join(f'<a href="/{page_name(language,key)}" data-material="{key}"'+(' aria-current="page"' if key==material else '')+f'>{name}</a>' for key,name in MATERIALS.items())
    return f'''<a class="skip-link" href="#reading-content">{COPY['skip']}</a>
<p class="embed-notice">{COPY['notice']}</p>
<header class="companion-header"><a href="/" class="brand brand-name">{COPY['brand']}</a><span class="brand-subtitle">{COPY['subtitle']}</span><p class="companion-intro" title="{COPY['notice']}">{COPY['noticeShort']}</p><a class="site-link" href="https://www.ceu.ox.ac.uk/research/unitybc" target="_blank" rel="noopener">{COPY['official']}</a><span data-page-title hidden></span><select data-ui-language hidden><option value="en">English</option></select></header>
<nav class="language-navigation" aria-label="{COPY['chooseLanguage']}"><span class="nav-caption">{COPY['chooseLanguage']}</span>{langs}<button type="button" data-embed-open>{COPY['embed']}</button></nav>
<nav class="material-navigation" aria-label="{COPY['chooseDocument']}">{docs}</nav>
<p class="sample-notice" {'hidden' if material!='questionnaire' else ''}>{COPY['sampleNotice']}</p>
<a class="embed-open" href="/{page_name(language,material)}" target="_blank" rel="noopener">{COPY['fullPage']}</a>'''

def build_runtime():
    core=(ROOT/'source/reader-core.js').read_text()
    view=(ROOT/'source/reader-interpreter-view.js').read_text()+'\n'+(ROOT/'source/reader-reader-view.js').read_text()
    assert core.count('/*INTERPRETER_VIEW*/')==1
    core=core.replace('/*INTERPRETER_VIEW*/',view)
    interpreter=(ROOT/'source/reader-interpreter.js').read_text()
    (ROOT/'assets/reader.js').write_text(interpreter+'\n'+core)

def validate_pairs(data):
    for unit in data['units']:
        if not unit.get('interpreterPairs'):
            raise ValueError('Missing passage mapping: '+unit['id'])
        if data['mode']!='questionnaire':continue
        cursor=0
        for index,text in enumerate(unit['options']['en']):
            start=unit['text']['en'].find(text,cursor)
            if start<0:raise ValueError('Option not found in source: '+unit['id'])
            cursor=start+len(text)
            matches=[p for p in unit['interpreterPairs'] if p['en']['charStart']<=start<p['en']['charEnd']]
            if len(matches)!=1 or 'optionIndex' in matches[0]:
                raise ValueError('Options need distinct explicit passage mappings: '+unit['id'])
            matches[0]['optionIndex']=index

def build():
    build_runtime()
    template=(ROOT/'source/template-unitybc-reader.md').read_text().split('---',2)[2].lstrip()
    template=template.replace('<style>{{STYLE}}</style>','<link rel="stylesheet" href="/assets/styles-reader.css"><link rel="stylesheet" href="/assets/styles-companion.css">')
    template=template.replace('<script>{{SCRIPT}}</script>','<script src="/assets/icons.js"></script><script src="/assets/media.js"></script><script src="/assets/companion-bootstrap.js"></script><script src="/assets/reader.js"></script><script src="/assets/companion.js"></script>')
    template=template.replace('preload="metadata"','preload="none"')
    template=template.replace('<div data-content>','<div data-content id="reading-content" tabindex="-1">')
    routes=[]
    for language in LANGUAGES:
        for material in MATERIALS:
            target='bn' if language=='en' else language
            meta=read_material(ROOT/'source'/f'material-{target}-{material}.md')
            data=copy.deepcopy(meta['data']);data['initialLanguage']=language
            data['defaults']['parallel']=language!='en'
            data['id']+='-english' if language=='en' else ''
            data['companion']={'language':language,'material':material,'copy':COPY}
            validate_pairs(data)
            body=re.sub(r'<header>.*?</header>',lambda _:navigation(language,material),template,count=1,flags=re.S)
            body=body.replace('<body class="reading">','<body class="'+('questionnaire' if data['mode']=='questionnaire' else 'reading')+(' english-only' if language=='en' else '')+'"><div data-document-root>')
            body=body.replace('<option value="bn">বাংলা</option>',f'<option value="{target}">{LANGUAGES[target]}</option>')
            body=body.replace('{{DATA}}',json.dumps(data,ensure_ascii=False).replace('</',r'<\/')).replace('{{COPY}}',json.dumps(meta['copy'],ensure_ascii=False).replace('</',r'<\/'))
            body=body.replace('</main>',f'</main><footer class="companion-footer"><a href="/about.html">{COPY["about"]}</a><a href="https://github.com/techczech/unitybc-read-and-listen">{COPY["source"]}</a><a href="/embed-guide.html">{COPY["guide"]}</a></footer>')
            body=body.replace('<title>UnityBC</title>',f'<title>{MATERIALS[material]} · {html.escape(LANGUAGES[language])} · UnityBC</title>')
            body=body.replace('</body>','</div></body>')
            assert '{{' not in body
            path=ROOT/page_name(language,material);path.write_text(body)
            routes.append({'file':path.name,'language':language,'material':material,'sections':len(data['units']),'bytes':path.stat().st_size})
    (ROOT/'assets/manifest-unitybc-pages.json').write_text(json.dumps(routes,indent=2)+'\n')
    print(f'Built {len(routes)} routes; shared code, no embedded audio.')

if __name__=='__main__':build()
