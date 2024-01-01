# vndb Script for Obsidian's Quickadd plugin

## Demo

https://github.com/akatopo/script-vndb-quickadd/assets/2387645/e005eaa7-f95d-40a4-9ed7-aed462162bc4

## Description

This script allows you to easily insert a visual novel note into your Obsidian vault using the [Quickadd plugin](https://github.com/chhoumann/quickadd) by @chhoumann. **Now also works on Mobile (make sure you use latest QuickAdd) !**

Uses the [vndb API](https://api.vndb.org/kana) to get the game information.

## Disclaimer

**Please never run a script that you don't understand. I cannot and will not be liable for any damage caused by the use of this script. Regularly make a backup of your Obsidian's vault !**

## Installation

1. Make sure you use latest QuickAdd version (at least 0.5.1) !
2. Save the script from the [latest release](https://github.com/akatopo/script-vndb-quickadd/releases/) to your vault somewhere. Make sure it is saved as a JavaScript file, meaning that it has the `.js` at the end.
3. Create a new template in your designated templates folder. Example template is provided below.
4. Open the Macro Manager by opening the QuickAdd plugin settings and clicking `Manage Macros`.
5. Create a new Macro - you decide what to name it.
6. Add the user script to the command list.
7. Add a new Template step to the macro. This will be what creates the note in your vault. Settings are as follows:
   1. Set the template path to the template you created.
   2. Enable File Name Format and use `{{VALUE:fileName}}` as the file name format. You can specify this however you like. The `fileName` value is the name of game without illegal file name characters.
   3. The remaining settings are for you to specify depending on your needs.
8. Click on the cog icon to the right of the script step to configure the script settings. This should allow you to set the path where game posters will be downloaded (the default is the vault root) and toggle clipboard data being used for game search.
9.  Go back out to your QuickAdd main menu and add a new Macro choice. Again, you decide the name. This is what activates the macro.
10. Attach the Macro to the Macro Choice you just created. Do so by clicking the cog ⚙ icon and selecting it.

### Example template

Please also find a definition of the variables used in this template below (see : [Template variable definitions](#template-variable-definitions)).

```
---
title: {{VALUE:title}}
platforms: {{VALUE:platforms}}
developer: {{VALUE:developer}}
keywords: {{VALUE:keywords}}
aliases: {{VALUE:aliases}}
poster: {{VALUE:posterPath}}
year: {{VALUE:year}}
releaseDate: {{VALUE:releaseDate}}
createdAt: {{DATE}}
vndbId: {{VALUE:vndbId}}
vndbUrl: {{VALUE:vndbUrl}}
vndbPoster: {{VALUE:posterUrl}}
---

# {{VALUE:templateTitle}}

{{VALUE:templatePoster}}

{{VALUE:templateDeveloper}}

## Description

{{VALUE:templateDescription}}
```

## Template variable definitions

Please find here a definition of the possible variables to be used in your template. Simply write `{{VALUE:name}}` in your template, and replace `name` by the desired video game data, including :

| Name                | Description                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fileName`          | The title of the game followed by release year in parentheses without illegal characters. Can be used in template configuration to name your file.                                                              |
| `title`             | The title of the game, single-quoted for use in properties.                                                                                                                                                     |
| `templateTitle`     | The title of the game without any quoting or escaping, for use in the note body.                                                                                                                                |
| `posterUrl`         | The poster url of the game (if available).                                                                                                                                                                      |
| `vndbUrl`           | The vndb url of the game.                                                                                                                                                                                       |
| `vndbId`            | The vndb id of the game.                                                                                                                                                                                        |
| `platforms`         | A list of platforms the game appeared on (if available). Single quoted and using the `[[Link]]` syntax, for use in properties.                                                                                  |
| `keywords`          | A list of keywords that apply to the game (if available). Single quoted and using the `[[Link]]` syntax, for use in properties.                                                                                 |
| `aliases`           | A list of aliases for the game's title (if available). Single quoted and using the `[[Link]]` syntax, constructed from the `aliases` and `title` fields from the vndb response. For use in properties. |
| `developer`         | A list of the game's developers (if available), single-quoted and using the `[[Link]]` syntax for use in properties.                                                                                                       |
| `templateDeveloper` | A comma separated list of the game's developers (if available), without any quoting or escaping, for use in the note body.                                                                                                                 |
| `year`              | The game's release year (if available).                                                                                                                                                                         |
| `releaseDate`       | The game's release date in `YYYY-MM-DD` format (if available).                                                                                                                                                  |
| `templateDescription` | The game's description (if available), parsed into markdown for use in the note body.                                                                                                                                 |
| `posterPath`        | The vault path where the game's poster was downloaded (if successful).                                                                                                                                          |
| `templatePoster`    | Either an embed using the downloaded poster path or an inline link with the poster url if the former failed, for use in the note body.                                                                          |
