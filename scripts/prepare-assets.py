"""Extract the supplied CutContour into independent render meshes (no artwork redraw).
Requires Pillow, numpy and opencv-python-headless. Run from the repository root.
"""
from pathlib import Path
from PIL import Image
import cv2,numpy as np,json
out=Path('dist/assets')
im=np.array(Image.open('planche avec fond perdus et cut.png').convert('RGB'))
pink=((im[:,:,0]>170)&(im[:,:,1]<120)&(im[:,:,2]>90)).astype(np.uint8)*255
pink=cv2.morphologyEx(pink,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
contours,hierarchy=cv2.findContours(pink,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
shapes=[]
for c in contours:
 if cv2.contourArea(c)<5000:continue
 c=cv2.approxPolyDP(c,.65,True);x,y,w,h=cv2.boundingRect(c)
 shapes.append({'points':c[:,0,:].tolist(),'bounds':[x,y,w,h]})
shapes.sort(key=lambda s:s['bounds'][1])
for s in shapes:
 x,y,w,h=s['bounds']
 if x>550 and y<100:name='Le globe'
 elif y<100:name='Digital Brand Makers'
 elif x>500 and y<500:name='Good ideas, better brand'
 elif x>450:name='Create · Connect · Share · Inspire'
 else:name=min([(218,'WE ARE'),(386,'MAKERS'),(525,'IMPACT'),(658,'GROWTH'),(794,'STORY'),(932,'TREND'),(1070,'MATCH')],key=lambda z:abs(y-z[0]))[1]
 s['name']=name
# Separate pink strokes from the print. One transparent texture makes the cut layer independent of bleed/backing.
overlay=np.zeros((im.shape[0],im.shape[1],4),dtype=np.uint8);overlay[:,:,:3]=[242,0,139];overlay[:,:,3]=pink
Image.fromarray(overlay).save(out/'contour.png')
(out/'contours.json').write_text(json.dumps({'width':im.shape[1],'height':im.shape[0],'stickers':shapes},separators=(',',':')))
print('Independent stickers:',len(shapes),[s['name'] for s in shapes])
