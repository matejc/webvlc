WebVLC
======

Simple web control for VLC with playlist support.


Technologies
------------

- nodejs
- VLC
- Polymer


Requirements
------------

- nodejs 4.x and above
- VLC media player


Install
-------

```
git clone git://github.com/matejc/webvlc
cd webvlc
npm install
```


Run
---

```
node .
```

This will start vlc and web application.


Usage
-----

- Open in browser `http://localhost:3000`

- Paste one youtube or online stream (radio) url

- Click on url when it appears to start playing

- Right click to stop (Ctrl+Right click to remove)

It acts as a playlist, when somebody pastes a link inside this browser window,
the url will be added to the playlist as last item in the playlist (first item
in the browser window).
