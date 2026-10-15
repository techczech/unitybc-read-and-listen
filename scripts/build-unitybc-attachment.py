"""Package the same reader as one offline HTML attachment. No provider calls."""
from pathlib import Path
import argparse,base64,importlib.util,json,re
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('companion_build',ROOT/'scripts/build-unitybc-companion.py')
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)

def inline_script(text):
    return '<script>'+text.replace('</script',r'<\/script')+'</script>'

def package(language,material,output,selection=None):
    page=ROOT/build.page_name(language,material)
    html=page.read_text()
    data=json.loads(re.search(r'<script id="material-data"[^>]*>(.*?)</script>',html,re.S).group(1))
    selection=selection or {}
    chosen={'language':language,'material':material,'section':data['units'][0]['id'],'pair':0,'view':'one' if language=='en' else 'side','listen':language,'speed':1,'focus':False,'pause':False,'follow':True,**selection}
    media={}
    for unit in data['units']:
        for lang,url in unit['tracks'].items():
            if language=='en' and lang!='en':continue
            media[url]=base64.b64encode((ROOT/url.lstrip('/')).read_bytes()).decode()
    for match in list(re.finditer(r'<link rel="stylesheet" href="([^"]+)">',html)):
        html=html.replace(match.group(0),'<style>'+(ROOT/match.group(1).lstrip('/')).read_text()+'</style>')
    for match in list(re.finditer(r'<script src="([^"]+)"></script>',html)):
        html=html.replace(match.group(0),inline_script((ROOT/match.group(1).lstrip('/')).read_text()))
    bootstrap=inline_script('window.UnityBCAttachmentSelection='+json.dumps(chosen,ensure_ascii=False)+';')+'<script id="attachment-media" type="application/json">'+json.dumps(media)+'</script>'
    html=html.replace('<script>',bootstrap+'<script>',1).replace('href="/','href="https://unitybc-read-and-listen.pages.dev/')
    class ResourceAudit(HTMLParser):
        resources=[]
        def handle_starttag(self,tag,attrs):
            attrs=dict(attrs)
            if tag=='script' and 'src' in attrs:self.resources.append(attrs['src'])
            if tag=='link' and attrs.get('rel')=='stylesheet':self.resources.append(attrs.get('href'))
    audit=ResourceAudit();audit.feed(html);assert not audit.resources,audit.resources
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html)
    return {'file':output.name,'bytes':output.stat().st_size,'language':language,'material':material,'recordings':len(media)}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--language',choices=build.LANGUAGES,default='en')
    p.add_argument('--material',choices=build.MATERIALS,default='lay-summary')
    p.add_argument('--output',type=Path)
    p.add_argument('--all',action='store_true',help='Build all fifteen document/language attachments')
    p.add_argument('--view',choices=['one','side'])
    p.add_argument('--listen',choices=['en','bn','ur','gu','cs','both'])
    p.add_argument('--section');p.add_argument('--pair',type=int)
    p.add_argument('--speed',type=float,choices=[.7,.85,1,1.25,1.5])
    p.add_argument('--focus',action='store_true');p.add_argument('--pause-after-segment',action='store_true');p.add_argument('--no-follow',action='store_true')
    a=p.parse_args();build.build()
    choices={k:v for k,v in vars(a).items() if k in ['view','listen','section','pair','speed'] and v is not None}
    choices.update(focus=a.focus,pause=a.pause_after_segment,follow=not a.no_follow)
    targets=[(lang,mat) for lang in build.LANGUAGES for mat in build.MATERIALS] if a.all else [(a.language,a.material)]
    for lang,mat in targets:
        out=a.output if not a.all and a.output else ROOT/'attachments'/f'unitybc-{lang}-{mat}.html'
        print(json.dumps(package(lang,mat,out,choices),ensure_ascii=False))

if __name__=='__main__':main()
