# 店家接單後台

此 repository 僅包含店家使用的 Firebase 訂單管理網站，`index.html` 是 GitHub Pages 首頁。

## 功能

- 即時接收 Firebase 訂單並更新狀態
- 查看訂單歷史與篩選狀態
- 查看不同期間的營業統計與熱銷餐點
- 在菜單管理分頁修改餐點價格及設定菜單照片網址

## GitHub Pages

在 repository 的 **Settings → Pages** 將發布來源設為 `main` 分支及 `/(root)`。部署完成後，開啟 GitHub Pages 提供的網站網址即可進入店家後台。

## 菜單管理

在店家後台選擇「菜單管理」，可更新餐點價格，或貼上可公開瀏覽的 HTTPS 圖片網址。照片網址儲存在 Firebase Firestore 的 `menu` 集合，不使用 Firebase Storage；顧客點餐網站需使用相同 Firebase 專案並讀取該集合，才能同步顯示更新後的菜單。

店家後台使用 Firebase Authentication 電子郵件／密碼登入。請在 Firebase Console 啟用電子郵件／密碼登入方式，並建立店家帳號；接著從 Authentication 的使用者清單複製該帳號 UID，將 `firestore.rules` 中的 `REPLACE_WITH_STORE_OWNER_UID` 換成實際 UID，再貼入 Firestore Rules 並發布。

Firestore Rules 允許顧客建立新訂單、公開讀取菜單；只有指定店家帳號能讀取訂單、更新訂單狀態及修改菜單。刪除訂單與菜單項目，以及其他資料路徑的存取預設拒絕。套用前請確認顧客點餐網站與店家後台使用相同 Firebase 專案。圖片必須由可公開讀取的 HTTPS 網站提供。
