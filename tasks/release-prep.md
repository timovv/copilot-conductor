# Release process

Input: package directory

## Get most recently released version

Check CHANGELOG.md in the package directory for the first entry with a release date other than Unreleased, e.g.

```md
## 1.0.0 (2024-01-01)
```

## Check for changes

The tag for the last release takes the form `${package name from package.json}_${most recently released version}`. Use this command to get the diff:

```bash
git --no-pager log ${last release tag}..HEAD -p ${package directory}/src
```

## Summarize

Summarize output from (b) with changes. Categorize into:
- Features added
- Bugs fixed
- Other changes

## Verification

Get user to verify that the changes look good, and provide the opportunity for them to make changes. Once the user is satisfied, proceed.

## If there are no changes

If, after checking with the user, there are no changes needing a release, continue to the next package. Otherwise, proceed.

## Update

Get the agent to update the CHANGELOG with changes for the most recent version. Example:

```md
# Release History

## 1.0.0 (Unreleased)

### Features added

[features added, if none omit this section]

### Bugs fixed

[bugs fixed, if none omit this section]

### Other changes

[other changes, if none omit this section]
```

The CHANGELOG may already contain the headings for the current version, in which case the content should be updated.
Any headings without content should be removed.

## Set release date

Set release date of changes to today's date.
