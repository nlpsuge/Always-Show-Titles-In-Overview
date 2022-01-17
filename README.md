<h1> Customize Overview (Always-Show-Titles-In-Overview) </h1>

This a Gnome Shell extension, which customizes the Overview, including always showing titles of all window thumbnails.

<p align="left">
  <a href="https://extensions.gnome.org/extension/1689/always-show-titles-in-overview/">
    <img alt="Get it on GNOME Extensions" width="228" src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true"/>
  </a>
</p>

![image](https://user-images.githubusercontent.com/2271720/142729037-df43f6b3-4891-40b0-8441-d28861aba544.png)

# Why I write this extention
Please read this post([Gnome 3.26: How to get the window titles in the activities view back?](https://www.reddit.com/r/gnome/comments/7dk1kb/gnome_326_how_to_get_the_window_titles_in_the/))
and this comment below [Gnome Bugzilla - Window picker layout improvements](https://bugzilla.gnome.org/show_bug.cgi?id=783953).

# Features
|Feature name|Default|
|------------|-------|
| Always show titles of all window thumbnails | - |
| Always show close buttons of all window thumbnails | - |
| Show app icons | on |
| App icon position (Bottom, Center) | Bottom |
| Hide icons when fullscreen | on |
| Hide icons for Video/TV players, like SMPlayer | on |
| Tweak the window thumbnail active size increment (from 5 to 60) | 15 |
| Hide the background | off |

# Settings
This extension has a Settings now, which makes it more useful:

![image](https://user-images.githubusercontent.com/2271720/146554573-4026afbc-a118-4899-87de-e8cee4e818af.png)


# TODO
- [x] Remove the fade time when leave a window
- [x] Find a way to distinguish the selected window and the others. 1. Maybe I can find a way to increase the light of the highlight around the selected window. 2. Or I can find a way to reverse the color of the title and it's background of the highlight around the selected window. (Gnome-shell has this feature now by larging thumbnail when the cursor hovers over it.)
- [x] Be compatible with GNOME Shell v3.36
- [x] Wine-based application's window has no close button. Remove 'if (this._windowCanClose())' can fix this issue, but I don't know if it's a good idea. I see that Wine application has close button now.
- [x] Add Preferences for this extension for setting show or hide app's icon, changing title's position
