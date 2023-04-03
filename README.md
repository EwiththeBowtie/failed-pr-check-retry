# GitHub Action to Retry Failed PR Checks
This is a GitHub Action that retrieves the failed checks for open pull requests in a given repository and automatically retries them up to a specified number of times.

## Inputs
*owner* (required): The owner of the repository.

*repo* (required): The name of the repository.

*token* (required): A personal access token with permissions to access the repository.

*maxRetries* (optional): The maximum number of times to retry failed checks. Default is 3.

Outputs
rerunJobs: A list of the rerun jobs.

rerunJobsCount: The number of rerun jobs.

## Usage
```
- name: Retry Failed PR Checks
  uses: my-org/retry-failed-pr-checks-action@v1
  with:
    owner: my-org
    repo: my-repo
    token: ${{ secrets.GITHUB_TOKEN }}
    maxRetries: 5
```

This Action retrieves the failed checks for all open pull requests in the specified repository and retries them unless they have been retried 5 or more times.

## Additional Notes
This Action uses the following Node.js packages:

@actions/core: A toolkit for writing actions in Node.js.
@actions/github: A toolkit for interacting with the GitHub API.
@octokit/rest: A REST API client for GitHub.
immutable: A library for creating immutable data structures.
moment: A library for working with dates and times.

To use this Action, you will need to create a personal access token with permissions to access the repository. You can create a new personal access token in your GitHub account settings. Be sure to keep your personal access token secret by storing it in a GitHub secret and using the ${{ secrets.GITHUB_TOKEN }} syntax to access it in your workflow.