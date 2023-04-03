const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require("@octokit/rest");
const Immutable = require("immutable");
const moment = require("moment");

// most @actions toolkit packages have async methods
async function run({ owner, repo, token, maxRetries, retryInterval }) {
  try {
    // Set the time range to retrieve failed checks for (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 30);
    const since = yesterday.toISOString();

    // Create a new Octokit instance with an authentication token (if needed)
    const octokit = new Octokit({
      auth: token,
    });

    // get open check status for open prs
    octokit.pulls
      .list({
        owner,
        repo,
        state: "open",
      })
      .then(({ data }) => {
        // Extract the failed checks from the API response
        data.forEach((pr) => {
          octokit.checks
            .listForRef({
              owner,
              repo,
              ref: pr.head.sha,
              status: "completed",
              filter: "latest",
            })
            .then((data) => {
              // Extract the failed checks from the API response
              const checks = Immutable.fromJS(data);
              const failedChecks = checks
                .getIn(["data", "check_runs"])
                .filter((check) => check.getIn(["conclusion"]) === "failure")
                .filter((check) => check.getIn(["completed_at"]) > since)
                .map((check) =>
                  Immutable.Map({
                    pr: check.getIn(["pull_requests", 0, "number"]),
                    name: check.getIn(["name"]),
                    details_url: check.getIn(["details_url"]),
                    completed_at: check.getIn(["completed_at"]),
                    time_since: moment(check.getIn(["completed_at"])).fromNow(),
                    conclusion: check.getIn(["conclusion"]),
                    run_id: check.getIn(["details_url"]).split("/")[7],
                    job_id: check.getIn(["details_url"]).split("/")[9],
                  })
                );
              return failedChecks;
            })
            .then((failedChecks) => {
              // use octokit to get run details from the details_url
              const runDetails = failedChecks.map((check) => {
                return octokit.actions
                  .getWorkflowRun({
                    owner,
                    repo,
                    run_id: check.get("run_id"),
                  })
                  .then((data) => {
                    const run = Immutable.fromJS(data);
                    const candidates = Immutable.Map({
                      run_attempt: run.getIn(["data", "run_attempt"]),
                      name: run.getIn(["data", "name"]),
                      workflow_file: run.getIn(["data", "path"]),
                      run_number: run.getIn(["data", "run_number"]),
                      status: run.getIn(["data", "status"]),
                      conclusion: run.getIn(["data", "conclusion"]),
                      workflow_id: run.getIn(["data", "workflow_id"]),
                      rerun_url: run.getIn(["data", "rerun_url"]),
                      run_id: run.getIn(["data", "id"]),
                    });
                    return candidates;
                  });
              });
              return Promise.all(runDetails);
            })
            .then((runDetails) => [].concat(...runDetails))
            .then((runDetails) => {
              return Promise.all(
                runDetails.map((run) => {
                  return octokit.actions.reRunWorkflowFailedJobs({
                    owner,
                    repo,
                    run_id: run.get("run_id"),
                  });
                })
              );
            })
            //output list of rerun jobs
            .then((rerunJobs) => {
              core.setOutput("rerunJobs", rerunJobs);
              core.setOutput("rerunJobsCount", rerunJobs.length);
            })
            .catch((error) => {
              // handle error
              console.log(error);
            });
        });
      });
  } catch (error) {
    core.setFailed(error.message);
  }
}
run({
  owner: core.getInput("owner"),
  repo: core.getInput("repo"),
  token: core.getInput("token"),
  maxRetries: core.getInput("maxRetries"),
});
