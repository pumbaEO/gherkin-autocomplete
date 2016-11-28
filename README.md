# Gherkin step autocomplete for Visual Studio Code extension

[![Join the chat at https://gitter.im/silverbulleters/gherkin-autocomplete](https://badges.gitter.im/silverbulleters/gherkin-autocomplete.svg)](https://gitter.im/silverbulleters/gherkin-autocomplete?utm_source=badge&utm_medium=badge&utm_content=badge)
[![GitHub release](https://img.shields.io/github/release/silverbulleters/gherkin-autocomplete.svg)](https://github.com/silverbulleters/gherkin-autocomplete/blob/master/CHANGELOG.md)
[![Dependency Status](https://gemnasium.com/badges/github.com/silverbulleters/gherkin-autocomplete.svg)](https://gemnasium.com/github.com/silverbulleters/gherkin-autocomplete)

Autocomplete of gherkin steps from all features in you workspace.  
Scans all `*.feature` files and creates a database with simple fuzzy search.

## Extension settings

* `gherkin-autocomplete.featureLibraries`  
Array of directories with external libraries of features  
Type: Array of strings  
Format: Relative ot absolute path to directory with feature-files.  
Default value: `[]`.  
Example:
```json
    "gherkin-autocomplete.featureLibraries" = [
        "tools/vanessa-behavior/features/Libraries",
        "lib/MyCompanyFeaturesLibrary"
    ]
```  

* `gherkin-autocomplete.featuresPath`  
Relative path to features directory.  
Type: String   
Default value: `"features"`.

## Extension commands

* `Gherkin autocomplete: Update steps cache`  
Recalculate workspace features' cache

![autocomplete](https://cloud.githubusercontent.com/assets/1132840/19971748/ffecea30-a1f0-11e6-9b23-1ed154338d17.gif)
