# 🔥 Firebase 設定教學（排行榜＋雲端存檔）

這份教學給**不熟技術的人**。照著做，大約 15 分鐘，就能讓遊戲有「每日／每週排行榜」和「Google 登入雲端存檔」。
**不做也完全沒關係**：沒設定的話，排行榜和雲端存檔會顯示「尚未開放」，遊戲其他部分照常運作，也不會去下載任何 Firebase 的東西。

> Firebase 是 Google 提供的免費雲端服務（有免費額度，見最後一節）。你需要一個 Google 帳號。

---

## 步驟 1：建立 Firebase 專案

1. 打開 <https://console.firebase.google.com/>，用 Google 帳號登入。
2. 按「**建立專案**」（Add project）。
3. 專案名稱隨意，例如 `foodfight`，按「繼續」。
4. 「啟用 Google Analytics」可以**關掉**（用不到），按「建立專案」，等它轉圈圈完成，按「繼續」。

## 步驟 2：建立網頁應用程式，拿到設定值

1. 專案首頁中間有一排圖示，點「**`</>`**」（網頁，Web）。
2. 暱稱填 `foodfight-web`，**不要**勾「Firebase Hosting」，按「註冊應用程式」。
3. 畫面會出現一段程式碼，裡面有一塊像這樣的東西：

   ```js
   const firebaseConfig = {
     apiKey: "AIza....",
     authDomain: "foodfight-xxxx.firebaseapp.com",
     projectId: "foodfight-xxxx",
     storageBucket: "foodfight-xxxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```

   **先留著這個畫面（或複製起來）**，步驟 5 要用。按「繼續前往主控台」。

> 這些值**不是密碼**，本來就會公開在網頁裡，沒有保密問題。真正的保護是步驟 6 的「安全規則」。

## 步驟 3：開啟 Firestore 資料庫

1. 左側選單：「**建構**」→「**Firestore Database**」→「建立資料庫」。
2. 位置選 `asia-east1`（台灣）或離你最近的，按「下一步」。
3. 安全規則選「**以正式版模式啟動**」，按「建立」。（規則等一下步驟 6 會換成我們的。）

## 步驟 4：開啟登入方式（Authentication）

1. 左側「**建構**」→「**Authentication**」→「開始使用」。
2. 「**登入方式**」分頁裡，開啟兩個：
   - **匿名**：按下去，開關打開，儲存。（讓玩家不用登入也能上排行榜。）
   - **Google**：按下去，開關打開，「專案的公開名稱」隨意，「支援電子郵件」選你自己的信箱，儲存。
3. 切到「**設定**」分頁 →「**已授權的網域**」→「新增網域」，把 **`dasarbe.github.io`** 加進去。
   （預設已有 `localhost` 和 `你的專案.firebaseapp.com`。如果之後換成自己的網址，也要加進來，不然 Google 登入會失敗。）

## 步驟 5：把設定值貼進遊戲

1. 打開遊戲專案裡的 `js/firebase-config.js`。
2. 把步驟 2 的每個值，貼到對應的引號裡，例如：

   ```js
   FF.FIREBASE_CONFIG = {
     apiKey: 'AIza....',
     authDomain: 'foodfight-xxxx.firebaseapp.com',
     projectId: 'foodfight-xxxx',
     storageBucket: 'foodfight-xxxx.appspot.com',
     messagingSenderId: '1234567890',
     appId: '1:1234567890:web:abcdef',
   };
   ```

3. 存檔，把這個檔案（commit 並 push）更新到 GitHub，等 GitHub Pages 部署完成（通常 1～2 分鐘）。

> 只要 `apiKey`、`projectId`、`appId` 三個有填，遊戲就會認為「雲端已設定」，排行榜與帳號頁就會開放。

## 步驟 6：貼上安全規則（很重要！）

1. 回到 Firebase Console：「**Firestore Database**」→「**規則**」分頁。
2. 把裡面原本的內容**全部刪掉**，貼上專案根目錄 `firestore.rules` 的**全部內容**。
3. 按「**發布**」。

這份規則做了這些事：
- 每個人只能寫「自己」的文件，不能改別人的。
- 每日成績：每人每天**只能建立一筆**，寫了就不能改、不能刪、不能被較低（或更高）的分數覆寫；日期必須是台灣時間的今天或昨天。
- 欄位型別與範圍檢查：分數、存活時間、波數、暱稱長度；而且「分數 ≤ 200 + 存活秒數 × 50」，不合理的成績會被擋下。
- 每週累計必須跟當天的每日成績一起寫入，且只能加上那天的分數。
- 雲端存檔只有本人能讀寫。
- 其他路徑一律拒絕。

> 規則擋得住亂寫、擋不住「在合理範圍內自己編成績」的有心人（這是沒有自己伺服器的限制）。這個遊戲的排行榜定位是朋友之間玩玩，如果要認真防作弊，需要自己架伺服器重放驗證，那是另一個等級的工程了。

## 步驟 7：試試看

1. 打開遊戲網址，主選單的「🏅 排行榜」「☁️ 雲端存檔」不再顯示「尚未開放」。
2. 玩一局「每日同題」，結算畫面按「上傳到今日排行榜」，設定暱稱。
3. 到 Firebase Console → Firestore Database → 資料，應該會看到 `daily`、`weekly` 集合出現資料。
4. 「雲端存檔」頁按「使用 Google 登入並備份」，成功後 `saves` 集合會出現你的存檔。

### 常見問題

| 狀況 | 怎麼辦 |
| --- | --- |
| 排行榜一直顯示「暫時連不上」 | 瀏覽器按 F12 看主控台。多半是步驟 3 沒建立資料庫、步驟 6 沒貼規則，或網路擋了 `gstatic.com`。 |
| Google 登入出現 `auth/unauthorized-domain` | 步驟 4 的「已授權的網域」沒加 `dasarbe.github.io`。 |
| Google 登入彈窗被擋 | 遊戲會自動改用整頁轉址登入，回來後會繼續。 |
| 排行榜寫入失敗 `permission-denied` | 規則沒貼對，或手機時間跟台灣差超過一天（日期檢查）。 |
| 想暫時關掉雲端功能 | 把 `js/firebase-config.js` 的 `apiKey` 清空即可。 |

## 開發者備註

- 本機測試不需要真連線：網址加 `?cloud=mock`（或在使用雲端功能之前，於主控台執行 `FF.debug.cloudMock()`）就會用瀏覽器內的模擬後端。
- Firebase SDK 版本寫在 `js/firebase-config.js` 的 `FF.FIREBASE_SDK_VERSION`，從 `www.gstatic.com` 以 ES module 動態載入，只有「設定了 Firebase」而且「玩家真的用到雲端功能（或之前用過）」才會載入。
- 每週榜算法：台灣時間的 ISO 週（週一～週日），把該週每天的「正式每日成績」加總，天天打才會爬得上去；顯示參加天數與單日最佳。
- 對決（戰帖）不上榜，只有每日同題的第一局正式成績可以上榜。

## 免費額度（Spark 方案）

Firebase 的免費方案（Spark）每天大約有：

- Firestore 讀取 5 萬次、寫入 2 萬次、刪除 2 萬次，儲存 1 GiB。
- Authentication 匿名與 Google 登入免費（Google 登入不限人數；簡訊登入才要錢，我們沒用）。

我們的用量：每人每天上傳排行榜約 2 次寫入（一筆每日、一筆每週）、看排行榜約 51～53 次讀取（前 50 名＋自己）、雲端存檔每局 1 次寫入。
以「每天 500 人、每人看 2 次排行榜、玩 5 局」估算：寫入約 3,500 次、讀取約 5 萬次——**小型遊戲通常用不完**。
超過免費額度時，Firestore 會暫時拒絕請求（不會自動扣款，除非你自己升級成 Blaze 付費方案）。遊戲在連不上時會優雅降級，只是排行榜暫時看不到。
建議在 Firebase Console →「使用情況與帳單」設個預算提醒，安心一點。
