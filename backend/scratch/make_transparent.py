from PIL import Image
import os

logo_path = "/Users/arivolirajan/Arivoli/antigravity_workspace/Resume-Interview-AI/frontend/public/ai_coach_logo.png"

if os.path.exists(logo_path):
    print("Opening logo...")
    img = Image.open(logo_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # If the pixel is close to pure white (R, G, B > 240), make it transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(logo_path, "PNG")
    print("Success: Background made transparent!")
else:
    print("Error: Logo file not found at " + logo_path)
