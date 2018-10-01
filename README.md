# Gherkin step autocomplete for Visual Studio Code extension

[![Join the chat at https://gitter.im/silverbulleters/gherkin-autocomplete](https://badges.gitter.im/silverbulleters/gherkin-autocomplete.svg)](https://gitter.im/silverbulleters/gherkin-autocomplete?utm_source=badge&utm_medium=badge&utm_content=badge)
[![GitHub release](https://img.shields.io/github/release/silverbulleters/gherkin-autocomplete.svg)](https://github.com/silverbulleters/gherkin-autocomplete/blob/master/CHANGELOG.md)
[![Dependency Status](https://gemnasium.com/badges/github.com/silverbulleters/gherkin-autocomplete.svg)](https://gemnasium.com/github.com/silverbulleters/gherkin-autocomplete)
[![Quality Gate](https://sonar.silverbulleters.org/api/badges/gate?key=gherkin-autocomplete)](https://sonar.silverbulleters.org//dashboard/index/gherkin-autocomplete)
[![Greenkeeper badge](https://badges.greenkeeper.io/silverbulleters/gherkin-autocomplete.svg)](https://greenkeeper.io/)

Autocomplete of gherkin steps from all features in you workspace.
Scans all `*.feature` files and creates a database with simple fuzzy search.
Scans all `*.bsl` files for 1C(BSL) and gives opportunity to find all references of gherkin steps in source code.

## Extension settings

* `gherkin-autocomplete.featureLibraries`

  - Array of directories with external libraries of features
  - Type: Array of strings
  - Format: Relative or absolute path to directory with feature-files.
  - Default value: `[]`.
  - Example:

```json
        "gherkin-autocomplete.featureLibraries": [
            "tools/add/features/Libraries",
            "lib/MyCompanyFeaturesLibrary"
        ]
```

* `gherkin-autocomplete.featuresPath`

  - Relative path to features directory.
  - Type: String
  - Default value: `"features"`.

* `gherkin-autocomplete.srcBslPath`

  - Array of directories with source of bsl files
  - Type: Array of strings
  - Format: Relative or absolute path to source of bsl files.
  - Default value: `[]`.
  - Example:

```json
        "gherkin-autocomplete.srcBslPath": [
            "./src",
            "MyCompanySourceFolder"
        ]
```

## Extension commands

* `Gherkin autocomplete: Update steps cache`

Recalculate workspace features' cache

![autocomplete](https://cloud.githubusercontent.com/assets/1132840/19971748/ffecea30-a1f0-11e6-9b23-1ed154338d17.gif)

| Quality Gate | Tech Debt | Errors | Code Smells |
| --- | --- | --- | --- |
| [![Quality Gate](https://sonar.silverbulleters.org/api/badges/gate?key=gherkin-autocomplete)](https://sonar.silverbulleters.org//dashboard/index/gherkin-autocomplete) | [![New Bugs](https://sonar.silverbulleters.org/api/badges/measure?key=gherkin-autocomplete&metric=sqale_debt_ratio)](https://sonar.silverbulleters.org//dashboard/index/gherkin-autocomplete) | [![Bugs](https://sonar.silverbulleters.org/api/badges/measure?key=gherkin-autocomplete&metric=bugs)](https://sonar.silverbulleters.org//dashboard/index/gherkin-autocomplete) | [![Bugs](https://sonar.silverbulleters.org/api/badges/measure?key=gherkin-autocomplete&metric=code_smells)](https://sonar.silverbulleters.org//dashboard/index/gherkin-autocomplete) |
