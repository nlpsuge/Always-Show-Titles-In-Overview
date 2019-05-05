# Always-Show-Titles-In-Overview
Always Show Titles In Overview can help to show titles of all windows in the Gnome 3 overview.
![](https://github.com/nlpsuge/Always-Show-Titles-In-Overview/blob/master/Screenshot1.png)

# Why I write such an extention
Please read this post([Gnome 3.26: How to get the window titles in the activities view back?
](https://www.reddit.com/r/gnome/comments/7dk1kb/gnome_326_how_to_get_the_window_titles_in_the/))
and this comment below a bug report([Window picker layout improvements](https://bugzilla.gnome.org/show_bug.cgi?id=783953)).

# TODO
- [x] Remove the fade time when leave a window
- [ ] Find a way to distinguish the selected window and the others. 1.Maybe I can find a way to increase the light of the highlight around the selected window. 2.Or I can find a way to reverse the color of the title and it's background of the highlight around the selected window.
- [x] Be compatible with GNOME Shell v3.32
- [ ] Wine-based application's window has no close button. Remove 'if (this._windowCanClose())' can fix this issue, but I don't know if it's a good idea.
