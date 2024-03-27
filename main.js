const core = require('@actions/core');
const github = require('@actions/github');

const main = () => {
    const todoRegex = core.getInput('todo-regex');
    console.log(`Regex: '${todoRegex}'`);

    core.setOutput("count", 0);
    // TODO: count-diff?

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);
};

try {
    main()
} catch (error) {
    core.setFailed(error.message);
}
