"""Build the public reader from fixed Markdown, without model/provider calls."""
from pathlib import Path
import copy, html, json, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = {'en':'English','bn':'বাংলা Bengali','ur':'اردو Urdu','gu':'ગુજરાતી Gujarati','cs':'Čeština Czech'}
MATERIALS = {'lay-summary':'Plain language summary','pis':'Participant information','questionnaire':'Questionnaire examples'}

def read_material(path):
    return json.loads(path.read_text().split('---', 2)[1])

def page_name(language, material):
    return 'index.html' if (language, material)==('en','lay-summary') else f'{language}-{material}.html'

def navigation(language, material):
    langs=''.join(f'<a href="/{page_name(code,material)}" data-language-code="{code}"'+(' aria-current="page"' if code==language else '')+f'>{name}</a>' for code,name in LANGUAGES.items())
    docs=''.join(f'<a href="/{page_name(language,key)}" data-material="{key}"'+(' aria-current="page"' if key==material else '')+f'>{name}</a>' for key,name in MATERIALS.items())
    return f'''<a class="skip-link" href="#reading-content">Skip to study text</a>
<header class="companion-header"><a href="/" class="brand brand-name">UnityBC</a><span class="brand-subtitle">Read and listen</span><a class="site-link" href="https://www.ceu.ox.ac.uk/research/unitybc" target="_blank" rel="noopener">Official study website ↗</a><span data-page-title hidden></span><select data-ui-language hidden><option value="en">English</option></select></header>
<p class="companion-intro">Research demonstration. Translations and AI-generated recordings are awaiting language review.</p>
<nav class="language-navigation" aria-label="Choose your language"><span class="nav-caption">Choose your language</span>{langs}</nav>
<nav class="material-navigation" aria-label="Choose a document">{docs}</nav>
<p class="sample-notice" {'hidden' if material!='questionnaire' else ''}>Three questionnaire examples. This demonstration does not enrol participants or submit answers.</p>
<a class="embed-open" href="/{page_name(language,material)}" target="_blank" rel="noopener">Open full page ↗</a>'''

def build_runtime():
    core=(ROOT/'source/reader-core.js').read_text()
    core=core.replace('...data.defaults,...state','...data.defaults,language:data.initialLanguage||data.defaults.language,...state')
    core=core.replace("state.index=Math.min(state.index,data.units.length-1);", "state.index=Math.max(0,Math.min(state.index,data.units.length-1));if(window.UnityBCStartSection!==null){const i=data.units.findIndex(u=>u.id===window.UnityBCStartSection);if(i>=0)state.index=i;}")
    blob="URL.createObjectURL(new Blob([Uint8Array.from(atob(clip),c=>c.charCodeAt(0))],{type:'audio/mpeg'}))"
    assert blob in core
    core=core.replace(blob,"new URL(clip,location.href).href")
    core=core.replace("if(activeKey===next){if(audio.paused){", "if(activeKey===next){if(audio.error)audio.load();if(audio.paused){")
    view=(ROOT/'source/reader-interpreter-view.js').read_text()+'\n'+(ROOT/'source/reader-reader-view.js').read_text()
    core=core.replace('/*INTERPRETER_VIEW*/',view)
    interpreter=(ROOT/'source/reader-interpreter.js').read_text()
    blob="URL.createObjectURL(new Blob([Uint8Array.from(atob(this.unit().tracks[lang]),c=>c.charCodeAt(0))],{type:'audio/mpeg'}))"
    assert blob in interpreter
    interpreter=interpreter.replace(blob,"new URL(this.unit().tracks[lang],location.href).href")
    (ROOT/'assets/reader.js').write_text(interpreter+'\n'+core)

def build():
    build_runtime()
    template=(ROOT/'source/template-unitybc-reader.html').read_text()
    template=template.replace('<style>{{STYLE}}</style>','<link rel="stylesheet" href="/assets/styles-reader.css"><link rel="stylesheet" href="/assets/styles-companion.css">')
    template=template.replace('<script>{{SCRIPT}}</script>','<script src="/assets/companion-bootstrap.js"></script><script src="/assets/reader.js"></script><script src="/assets/companion.js"></script>')
    template=template.replace('preload="metadata"','preload="none"')
    template=template.replace('<div data-content>','<div data-content id="reading-content" tabindex="-1">')
    routes=[]
    for language in LANGUAGES:
        for material in MATERIALS:
            target='bn' if language=='en' else language
            meta=read_material(ROOT/'source'/f'material-{target}-{material}.md')
            data=copy.deepcopy(meta['data']);data['initialLanguage']=language
            data['id']+='-english' if language=='en' else ''
            data['companion']={'language':language,'material':material}
            body=re.sub(r'<header>.*?</header>',lambda _:navigation(language,material),template,count=1,flags=re.S)
            body=body.replace('<body class="reading">','<body class="reading'+(' english-only' if language=='en' else '')+'">')
            body=body.replace('<option value="bn">বাংলা</option>',f'<option value="{target}">{LANGUAGES[target]}</option>')
            body=body.replace('{{DATA}}',json.dumps(data,ensure_ascii=False).replace('</',r'<\/')).replace('{{COPY}}',json.dumps(meta['copy'],ensure_ascii=False).replace('</',r'<\/'))
            body=body.replace('</main>','</main><footer class="companion-footer"><a href="/about.html">About this demonstration</a><a href="https://github.com/techczech/unitybc-read-and-listen">Source and recordings</a><a href="/embed-guide.html">Embed this reader</a></footer>')
            body=body.replace('<title>UnityBC</title>',f'<title>{MATERIALS[material]} · {html.escape(LANGUAGES[language])} · UnityBC</title>')
            assert '{{' not in body
            path=ROOT/page_name(language,material);path.write_text(body)
            routes.append({'file':path.name,'language':language,'material':material,'sections':len(data['units']),'bytes':path.stat().st_size})
    (ROOT/'assets/manifest-unitybc-pages.json').write_text(json.dumps(routes,indent=2)+'\n')
    print(f'Built {len(routes)} routes; shared code, no embedded audio.')

if __name__=='__main__':build()
