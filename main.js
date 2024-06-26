const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require("path");

async function* walk(directory) {
    for await (const d of await fs.promises.opendir(directory)) {
        const entry = path.join(directory, d.name);
        if (d.isDirectory())
            yield* walk(entry);
        else if (d.isFile())
            yield entry;
    }
};

const main = async () => {
    const inputTodoRegex = core.getInput('todo-regex');
    const inputFilesIncludeRegex = core.getInput('include-files');
    const inputFilesExcludeRegex = core.getInput('exclude-files');
    const inputGitHubToken = core.getInput('github-token');
    const inputSkipComment = core.getInput('skip-comment');
    const inputDebug = core.getInput('debug');

    const todoRegex = new RegExp(inputTodoRegex, 'mg');
    const filesIncludeRegex = new RegExp(inputFilesIncludeRegex);
    const filesExcludeRegex = new RegExp(inputFilesExcludeRegex);

    console.log(`todo: ${todoRegex}`);
    console.log(`include-files: ${filesIncludeRegex}`);
    console.log(`exclude-files: ${filesExcludeRegex}\n`);

    const fileFilter = (file) => filesIncludeRegex.test(file) && !filesExcludeRegex.test(file);

    let totalCount = 0;
    for await (const file of walk('.')) {
        if (!fileFilter(file)) {
            if (inputDebug == 'true') console.log(`skipping file: ${file}`);
            continue;
        }

        const contents = await fs.promises.readFile(file, { encoding: 'utf8' });
        let count = [...contents.matchAll(todoRegex)].length;
        console.log(`${file} -> ${count}`);
        totalCount += count;
    }

    core.setOutput("count", totalCount);

    if (inputSkipComment == 'true') {
        console.log('Skipping comment.');
        return;
    }
    if (github.context.eventName != 'pull_request') {
        console.log('Not a pull request, skipping comment.');
        return;
    }

    const octokit = github.getOctokit(inputGitHubToken);
    const { data: comments } = await octokit.rest.issues.listComments({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.issue.number,
    })
    const botComment = comments.find(comment => {
        return comment.body.includes("TODO count:")
    });

    const body = `TODO count: ${totalCount}`;

    if (botComment !== undefined) {
        if (inputDebug == 'true') console.log(`comment ${botComment.id} found, updating...`);
        await octokit.rest.issues.updateComment({
            comment_id: botComment.id,
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            body: body,
        })
    } else {
        if (inputDebug == 'true') console.log(`no TODO comment found, creating...`);
        await octokit.rest.issues.createComment({
            issue_number: github.context.issue.number,
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            body: body,
        })
    }
};

try {
    main()
} catch (error) {
    core.setFailed(error.message);
}
