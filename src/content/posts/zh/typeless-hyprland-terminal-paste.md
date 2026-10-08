---
title: Typeless Linux 版在 Omarchy 上貼不進終端機：坑我踩完了，gist 直接丟給你的 AI
description: Typeless 剛出 Linux 版，我在 Omarchy（Hyprland）上第一天就撞到兩個坑：終端機貼不上字、聽寫浮動視窗消失。兩條 Hyprland 設定修好，附可以直接丟給 AI 的 gist。
date: 2026-10-08
lang: zh
tags:
- LINUX
- HYPRLAND
- WAYLAND
translationKey: typeless-hyprland-terminal-paste
---

我最近把主力開發環境換到 Omarchy，又剛好是 Typeless 的訂戶，它九月底才推出 Linux 版，想當然耳要裝來用。結果第一天就撞到兩個坑：語音輸入在 Chrome 正常，在 kitty 裡一個字都貼不出來；聽寫時那個小浮動視窗，換個 workspace 就不見了。坑踩完了，修法是兩條 Hyprland 設定，先給你。

## TL;DR

如果你也在 Omarchy（或任何 Hyprland 0.56+ 加 Fcitx5）上用 Typeless，把這份 gist 整個貼給你的 AI 助理，請它套到你的設定裡：

[gist：Typeless 2.2.0 on Omarchy / Hyprland 修法](https://gist.github.com/kehao-chen/5f48504ee834d944a56fb8d1888636c3)

它做兩件事，都在 compositor 層，不動 Typeless 也不動 kitty：

- 只攔 Typeless 那把虛擬鍵盤送出的 `Ctrl+V`，在終端機改送 `Shift+Insert`，其他視窗照舊。你自己的鍵盤不受影響。
- 把聽寫浮動視窗 `pin` 到所有 workspace。

## 坑一：終端機裡一個字都沒有

Typeless 在 Linux 上的設計是先透過輸入法引擎把字送進去，失敗才退回剪貼簿。它的安裝目錄裡有 Fcitx5 addon 的設定檔，有 IBus 用的引擎，就是沒有 Fcitx5 addon 本體 `typeless-voice.so`。註冊腳本對這件事的處理方式是：

```bash
if [[ ! -f "${addon_so}" ]]; then
  echo "Fcitx5 VoiceIME addon not built; skipping Fcitx5 registration."
  return 0
fi
```

安靜跳過，回傳成功。官方 .deb 裡也沒有這個檔案，不是 AUR 打包漏掉。所以在我的機器上，每一次聽寫 log 都長這樣：

```text
[VoiceIme] status=failed stage=switch-engine target=typeless-voice
[TextInjection] backend=fcitx status=skipped reason=no-ibus-compensation
[insertText] backend=clipboard-paste status=succeeded clipboardRestoreDelayMs=500
```

退回剪貼簿之後，Typeless 用一把自己建的虛擬鍵盤 `Typeless InputHelper Virtual Keyboard` 送出 `Ctrl+V`。這在 Chrome、Teams 都沒問題，因為 GUI 把 `Ctrl+V` 當貼上。kitty 不是：它的貼上鍵是 `Ctrl+Shift+V` 和 `Shift+Insert`，`Ctrl+V` 原樣交給 shell，在 bash 和 zsh 裡那是 quoted-insert，畫面上什麼都不會有。

最諷刺的是那把虛擬鍵盤的能力表只有六個鍵：Backspace、LeftCtrl、LeftShift、C、V、Insert。它有 Shift，也有 Insert，只是從來沒用過。

## 坑二：浮動視窗不是不見，是在 workspace 1

聽寫時 Typeless 會開一個小浮動視窗顯示狀態。我原本回報給客服的是「焦點在 Chromium 原生 Wayland 視窗時不出現」，這個描述是錯的。`hyprctl clients -j` 一看，那個 `Status` 視窗是普通浮動視窗，`pinned=false`，就留在它第一次出現的 workspace 1。把 Chrome 搬到 workspace 1，它就在。

Typeless 自己沒辦法把視窗 pin 住，在 Hyprland 這是 compositor 用 window rule 決定的事。Omarchy 自己的 picture-in-picture 規則就是這樣寫的。

## 修法

**不要**在 kitty 加 `map ctrl+v paste_from_clipboard`。我一度想這樣做，代價是 shell 的 quoted-insert 和 herdr 的貼圖片快捷鍵全被攔走，每天都會撞到。

能改的地方是 compositor。Hyprland 的綁定可以限定只對特定輸入裝置生效（wiki 的 Per-Device Binds，查核 2026-10），所以我在 `~/.config/hypr/bindings.lua` 加了一條只認 `typeless-inputhelper-virtual-keyboard` 的 `Ctrl+V`。判斷終端機的方式照抄 Omarchy 的 `Super+V`：看視窗有沒有 `terminal` tag。

```lua
local function typeless_send_once(mods, key)
  hl.dispatch(hl.dsp.send_key_state({ mods = mods, key = key, state = "down" }))
  hl.timer(function()
    hl.dispatch(hl.dsp.send_key_state({ mods = mods, key = key, state = "up" }))
  end, { timeout = 50, type = "oneshot" })
end

hl.bind("CTRL + V", function()
  local window = hl.get_active_window()
  for _, tag in ipairs((window and window.tags) or {}) do
    if tag:gsub("%*$", "") == "terminal" then
      return typeless_send_once("SHIFT", "Insert")
    end
  end
  typeless_send_once("CTRL", "V")
end, {
  description = "Typeless paste (terminal-aware)",
  device = { inclusive = true, list = { "typeless-inputhelper-virtual-keyboard" } },
})
```

`device.inclusive = true` 表示只有清單裡的裝置能觸發這條綁定。裝置名稱用 `hyprctl devices` 查。

浮動視窗那邊是一條 window rule，在 `~/.config/hypr/hyprland.lua`：

```lua
o.window({ class = "^Typeless$", title = "^Status$" }, {
  float = true,
  pin = true,
  no_focus = true,
  border_size = 0,
})
```

`hyprctl reload` 後 `hyprctl configerrors` 沒有輸出，kitty 可以貼上，Chrome 照常，浮動視窗跟著我切 workspace。gist 裡有驗證指令和非 Omarchy 的改法。

## 附錄：我怎麼繞了兩天

這段跟修法無關，純粹是自首。

一開始症狀不穩定，herdr 貼進去是空白，純 kitty 有時好有時壞。log 每次都說成功，所以我把注意力放在「貼上之後」：我猜過 herdr 在遠端讀錯剪貼簿，猜過它非同步讀取撞上 Typeless 500 ms 後的還原，猜過 helper 子程序死了。三個都查了，三個都錯。

第二個我信了最久。剪貼簿一出現聽寫文字，16 ms 後 herdr 就記了一行 `clipboard image paste trigger received, but local clipboard has no image`，怎麼看都像它讀太慢、剪貼簿已經被還原。事後才懂，那行根本就是答案：herdr 收到了一個它認定為貼圖片的按鍵。

後來是對照組救了我。GUI 都正常，只有終端機不行，那問題就在「貼上」那一個動作；而 kitty 自己就有工具可以看它收到什麼：

```bash
kitty +kitten show_key -m kitty
```

開著它聽寫一次，印出來的是 `ctrl+v PRESS`。兩天的時序推論，一個指令就結束了。

更尷尬的是坑二。在搞清楚浮動視窗只是在別的 workspace 之前，我以為它在 Wayland 下根本不會正常顯示，花了半天寫了一個 Omarchy 狀態列 plugin，用 PipeWire 串流和 Typeless 的 SQLite 去推它是不是在聽寫。它能動，解的是一個不存在的問題。讓我回頭重看的是客服一句追問：「是每次都不出現，還是偶爾？」要回答就得重新觀察，一觀察它就在那裡。

教訓兩條：在 Wayland 下遇到「注入的文字沒出現」，先用目標程式自己的工具看它收到什麼按鍵，別猜時序；「看不到」要先分清楚是不存在還是不在眼前，再決定要不要做替代方案。

## 誠實邊界

- 驗過的：實體鍵盤的 `Ctrl+V` 不受新綁定影響（在 kitty 按 `Ctrl+V` 再按 `Tab`，出現 `^I`）；herdr 收到 `Shift+Insert` 後正常貼上；重啟 Typeless 後，浮動視窗由 window rule 自動 pin，不用手動。
- 沒驗的：gist 裡非 Omarchy 的改法是照 Hyprland wiki 的語法推的，我沒有在沒裝 Omarchy 的 Hyprland 上試過。
- 沒修的：剪貼簿那條路有個副作用，Omarchy 的剪貼簿歷史記下了每一次聽寫內容。500 ms 後還原擋不住剪貼簿管理器。這個我沒修，已經回報給 Typeless，連同「Linux 版請附上 Fcitx5 addon」和「對終端機改送 Shift+Insert，你們的虛擬鍵盤本來就有那兩個鍵」。

## 更新

2026-10-08：Typeless 客服回覆，問題與建議已記錄並轉交團隊調查。沒有時程。有新版我會回來補。

---

*本文由作者規劃與撰寫，AI（Claude）協助草稿整理與查證；技術內容與觀點由作者確認並負責。*
