# Generate an SDK

Input: URL to the tspconfig.yaml file

# Prerequisites

- tsp-client is installed (if not, `npm install -g @azure-tools/typespec-client-generator-cli`)

# Get package directory

Get the agent to fetch the tspconfig.yaml content from the URL and extract the package name and service directory from the YAML. The YAML will have this structure:

```yaml
parameters:
  "service-dir":
    default: <SERVICE DIRECTORY>
  "dependencies":
    default: ""
options:
  "@azure-tools/typespec-ts":
    package-dir: <PACKAGE SUBDIRECTORY>
    package-details:
      name: <PACKAGE NAME>
    flavor: azure
  # ... other emitters but these can be ignored
```

The package directory relative to the root of the repository is `<SERVICE DIRECTORY>/<PACKAGE SUBDIRECTORY>`, and will be referred to in the coming steps.

# Check if it's a new package

It's a new package if the package directory doesn't exist, or if the package directory does exist but doesn't contain a `tsp-location.yaml` at the top level.

## If it's a new package

Get the agent to run `tsp-client init -c <spec url>`.

Then, get the agent to add an entry for `rush.json`:

```jsonc
{
  // ...irrelevant options omitted
  "projects": [
    // ...existing entries omitted
    {
      "packageName": "<PACKAGE NAME>",
      "projectFolder": "<PACKAGE DIRECTORY>",
      "versionPolicyName": "client"
    }
  ]
}
```

## If it's not a new package

Get the agent to run `tsp-client update -c <spec url>` in the package directory

# Verify

When these steps are done, get the agent to build and verify:

```bash
rush update
rush build -t <package-name>
```

And in the package directory, get the agent to run:

```bash
rushx format
rushx lint
```
