---
title: 'Typeless for Linux won''t paste into a terminal on Omarchy: I hit the potholes, here''s a gist for your AI'
description: 'Typeless just shipped for Linux. Day one on Omarchy (Hyprland): nothing pasted into the terminal, the dictation window vanished. Two Hyprland settings fix both.'
date: 2026-10-08
lang: en
tags:
- LINUX
- HYPRLAND
- WAYLAND
translationKey: typeless-hyprland-terminal-paste
---

I recently moved my main development environment to Omarchy, and I happen to be a Typeless subscriber. It only shipped a Linux build in late September, so of course I installed it. Day one, two potholes: voice input worked in Chrome, but not a single character landed in kitty; and the little floating window that appears while dictating was gone the moment I switched workspace. I've been through both. The fix is two Hyprland settings, and they come first.

## TL;DR

If you're also running Typeless on Omarchy (or any Hyprland 0.56+ with Fcitx5), paste this gist to your AI assistant and ask it to apply it to your config:

[gist: Typeless 2.2.0 on Omarchy / Hyprland fix](https://gist.github.com/kehao-chen/53cbeb402802c1fd75e43619349237f4)

It does two things, both at the compositor level. Typeless and kitty are left alone:

- Intercept `Ctrl+V` only when it comes from the Typeless virtual keyboard, and send `Shift+Insert` instead in terminals. Every other window gets `Ctrl+V` as before. Your own keyboard is untouched.
- `pin` the dictation window to every workspace.

## Pothole 1: not a single character in the terminal

On Linux, Typeless is designed to push text through an input method engine first and fall back to the clipboard only when that fails. The install directory has the Fcitx5 addon config, and it has the engine for IBus. The Fcitx5 addon itself, `typeless-voice.so`, is missing. The registration script handles that like this:

```bash
if [[ ! -f "${addon_so}" ]]; then
  echo "Fcitx5 VoiceIME addon not built; skipping Fcitx5 registration."
  return 0
fi
```

Skip quietly, return success. The official .deb doesn't ship the file either, so this isn't the AUR package dropping it. On my machine, then, every dictation logs the same thing:

```text
[VoiceIme] status=failed stage=switch-engine target=typeless-voice
[TextInjection] backend=fcitx status=skipped reason=no-ibus-compensation
[insertText] backend=clipboard-paste status=succeeded clipboardRestoreDelayMs=500
```

After falling back to the clipboard, Typeless sends `Ctrl+V` from a virtual keyboard it creates, `Typeless InputHelper Virtual Keyboard`. That's fine in Chrome and Teams, because GUI apps treat `Ctrl+V` as paste. kitty doesn't: its paste keys are `Ctrl+Shift+V` and `Shift+Insert`. `Ctrl+V` goes straight through to the shell, where bash and zsh treat it as quoted-insert, and nothing appears on screen.

And yet that virtual keyboard's capability table lists exactly six keys: Backspace, LeftCtrl, LeftShift, C, V and Insert. It has both Shift and Insert and never uses them.

## Pothole 2: the floating window isn't gone, it's on workspace 1

While dictating, Typeless opens a small floating window showing its status. What I originally told support was "it doesn't appear when a native Wayland Chromium window has focus". That description was wrong. One look at `hyprctl clients -j`: the `Status` window is an ordinary floating window with `pinned=false`, sitting on workspace 1 where it first appeared. Move Chrome to workspace 1 and there it is.

Typeless can't pin its own window. On Hyprland that's the compositor's decision, made with a window rule. Omarchy's own picture-in-picture rule is written exactly this way.

## The fix

**Don't** add `map ctrl+v paste_from_clipboard` to kitty. I was about to. The price is the shell's quoted-insert and herdr's paste-image shortcut both getting swallowed, and you'd hit that every day.

The place to change is the compositor. Hyprland binds can be restricted to a specific input device (Per-Device Binds in the wiki, checked 2026-10), so I added a `Ctrl+V` bind to `~/.config/hypr/bindings.lua` that only listens to `typeless-inputhelper-virtual-keyboard`. The terminal check is copied from Omarchy's `Super+V`: does the window carry the `terminal` tag?

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

`device.inclusive = true` means only the devices in the list can trigger this bind. Find the device name with `hyprctl devices`.

The floating window is one window rule in `~/.config/hypr/hyprland.lua`:

```lua
o.window({ class = "^Typeless$", title = "^Status$" }, {
  float = true,
  pin = true,
  no_focus = true,
  border_size = 0,
})
```

After `hyprctl reload`, `hyprctl configerrors` prints nothing, kitty pastes, Chrome still works, and the floating window follows me across workspaces. The gist has the verification commands and the variant for Hyprland without Omarchy.

## Appendix: how I lost two days

This part has nothing to do with the fix. It's a confession.

The symptoms were inconsistent at first: herdr pasted blanks, plain kitty worked sometimes and not others. The log said success every time, so I put my attention on what happened after the paste. I guessed herdr was reading the wrong clipboard on the remote end. I guessed its async read was colliding with the restore Typeless does 500 ms later. I guessed the helper subprocess had died. I checked all three. All three were wrong.

The second one had me the longest. 16 ms after the dictated text landed in the clipboard, herdr logged `clipboard image paste trigger received, but local clipboard has no image`, which looked exactly like a slow read hitting an already-restored clipboard. Only later did I see that the line was the answer: herdr had received a key it treats as paste-image.

The control group got me out. The GUI apps all worked and only terminals failed, so the problem had to be in the single act of pasting. And kitty has its own tool for seeing what it receives:

```bash
kitty +kitten show_key -m kitty
```

Dictate once with that running and it prints `ctrl+v PRESS`. One command ended two days of timing theories.

Pothole 2 is more embarrassing. Before I worked out that the floating window was just on another workspace, I assumed it couldn't render properly under Wayland at all, and spent half a day writing an Omarchy status bar plugin that watched the PipeWire stream and the Typeless SQLite database to infer whether it was listening. It works, and it solves a problem that doesn't exist. One follow-up question from support sent me back to look: "does it never appear, or only sometimes?" Answering that meant observing again, and the moment I did, there it was.

I took two lessons from this. On Wayland, when injected text doesn't show up, use the target program's own tools to see what key it actually received before you theorise about timing. And when something is "not visible", work out whether it doesn't exist or is just not in front of you before you build a replacement.

## What I did and didn't verify

- Verified: the physical keyboard's `Ctrl+V` is unaffected by the new bind (press `Ctrl+V` then `Tab` in kitty and you get `^I`); herdr pastes normally after receiving `Shift+Insert`; after restarting Typeless, the window rule pins the floating window on its own, no manual step.
- Not verified: the non-Omarchy variant in the gist follows the Hyprland wiki's syntax, but I haven't tried it on a Hyprland without Omarchy.
- Not fixed: the clipboard route has a side effect. Omarchy's clipboard history records every dictation, and the 500 ms restore doesn't stop a clipboard manager. I've reported it to Typeless, along with "please ship the Fcitx5 addon with the Linux build" and "send Shift+Insert to terminals, your virtual keyboard already has both keys".

## Update

2026-10-08: Typeless support replied. The issues and suggestions have been logged and passed to the team to investigate, with no timeline. I'll come back and add a note when a new version lands.

---

*Planned and written by the author, with AI (Claude) assisting in drafting and fact-checking. The technical content and opinions have been reviewed by the author, who takes responsibility for them.*
