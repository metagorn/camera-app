# Camera App (Expo + React Native)


แอปกล้องตัวอย่างด้วย Expo ที่มีฟีเจอร์คล้ายกล้องมือถือ:
- แสดงภาพจากกล้องแบบเรียลไทม์
- ปุ่มถ่ายรูป (ชัตเตอร์)
- หน้าพรีวิวรูปที่ถ่าย พร้อมปุ่ม “ถ่ายใหม่” และ “บันทึก”
- ปุ่มสลับกล้อง (หน้า/หลัง)
- ปุ่มเปิด/ปิดไฟฉาย (เฉพาะกล้องหลัง)
- คลังภาพภายในแอป: รูปย่อมุมซ้ายล่าง + Modal แสดงภาพล่าสุดแบบกริด
- Grid Overlay (Rule of Thirds) สำหรับช่วยจัดองค์ประกอบ

## โครงสร้างโปรเจกต์
```
camera-app/
├─ App.tsx            # UI และลอจิกหลักของกล้อง/คลังภาพ/สิทธิ์
├─ index.ts           # จุดเริ่มต้นแอป (registerRootComponent)
├─ app.json           # การตั้งค่า Expo (รวม iOS infoPlist ข้อความขอสิทธิ์)
├─ package.json       # สคริปต์และ dependencies
├─ tsconfig.json      # TypeScript config
└─ assets/            # ไอคอน สปแลช
```

## การติดตั้ง
ต้องมี Node.js และ npm ติดตั้งไว้ก่อน

```powershell
npm install
```

หากติด dependency mismatch กับ Expo แนะนำรัน:
```powershell
npx expo install
```
เพื่อให้เวอร์ชันแพ็กเกจสอดคล้องกับ Expo SDK ปัจจุบัน

## การรันแอป
```powershell
npm run start
```
- สแกน QR ด้วยแอป Expo Go (Android) หรือกล้อง (iOS)
- หรือกด a เพื่อเปิด Android Emulator, w เพื่อเปิด Web (กล้องอาจจำกัดฟีเจอร์)

หมายเหตุ Android (Expo Go): Expo Go มีข้อจำกัดการเข้าถึงคลังรูปภาพบน Android รุ่นใหม่ หากต้องการทดสอบฟังก์ชันคลังภาพแบบเต็มให้สร้าง Development Build ตามเอกสาร Expo

## ฟีเจอร์และการใช้งาน
- หน้ากล้อง:
  - แถบด้านบน: ปุ่มไอคอนไฟฉาย (เปิด/ปิด)
  - แถบด้านล่าง: มุมซ้ายเป็นรูปย่อคลังภาพ, ตรงกลางปุ่มชัตเตอร์, ขวาเป็นปุ่มสลับกล้อง
  - เส้น Grid (Rule of Thirds) ช่วยเล็งภาพ
- ถ่ายรูป: กดชัตเตอร์ -> เข้าหน้าพรีวิว
- พรีวิวรูป: ปุ่ม “ถ่ายใหม่” เพื่อถ่ายอีกครั้ง, ปุ่ม “บันทึก” เพื่อบันทึกสู่แกลเลอรี่เครื่อง
- คลังภาพ: กดภาพย่อซ้ายล่างเพื่อเปิด Modal แสดงรูปล่าสุดแบบกริด 3 คอลัมน์

## สิทธิ์ที่ใช้งาน
- กล้อง: ขอสิทธิ์ผ่าน `expo-camera`
- คลังภาพ/สื่อ: ขอสิทธิ์ผ่าน `expo-media-library` เมื่อบันทึกหรือเปิดคลังภาพครั้งแรก
- iOS: กำหนดข้อความขอสิทธิ์ใน `app.json` (infoPlist)

## สคริปต์ที่มีในโปรเจกต์
```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web"
}
```

## ไลบรารีที่ใช้
- expo
- expo-camera
- expo-media-library
- react, react-native
- @expo/vector-icons (ไอคอนปุ่ม)

## Troubleshooting
- Expo Go บน Android: ถ้าเปิดคลังภาพแล้วฟีเจอร์ไม่ครบ ให้ใช้ Development Build
- สิทธิ์ถูกปฏิเสธ: ไปที่ Settings ของเครื่อง เพื่ออนุญาต Camera/Photos ใหม่ แล้วเปิดแอปอีกครั้ง
- หากพบ Peer dependency เตือน: ใช้ `npx expo install` เพื่อจัดเวอร์ชันให้สอดคล้อง SDK

---
