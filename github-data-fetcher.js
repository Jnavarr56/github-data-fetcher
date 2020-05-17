const fs = require("fs");
const ora = require("ora");
const chalk = require("chalk");
const dotenv = require("dotenv");
const readlineSync = require("readline-sync");
const { Octokit } = require("@octokit/rest");

function delay(ms) {
	return new Promise(function (resolve) {
		setTimeout(resolve, ms);
	});
}

process.on("SIGINT", function () {
	process.exit(1);
});

(async function () {
	const envSpinner = ora({
		text: chalk.yellow("Checking for .env file"),
		color: "yellow"
	}).start();
	const envCheck = dotenv.config();

	await delay(500);

	envSpinner.stopAndPersist({ symbol: chalk.yellow("⠿") });

	if (envCheck.error) {
		ora({
			indent: 2,
			text: chalk.red("Missing .env file!")
		})
			.start()
			.fail();
		process.exit(1);
	} else {
		ora({
			indent: 2,
			text: chalk.green("Found .env file!")
		})
			.start()
			.succeed();

		const envVars = [ "PERSONAL_ACCESS_TOKEN" ];

		let failed = false;
		for (let cred of envVars) {
			if (!process.env[cred]) {
				failed = true;
				ora({
					indent: 4,
					text: chalk.red(`Missing valid ${cred} credential!`)
				})
					.start()
					.fail();
			}
		}

		if (failed) {
			process.exit(1);
		}
	}

	console.log("");

	await delay(250);

	const octoAuthSpinner = ora({
		text: chalk.yellow("Initializing Github Client"),
		color: "yellow"
	}).start();

	const octokit = new Octokit({
		auth: process.env.PERSONAL_ACCESS_TOKEN
	});

	await delay(500);

	try {
		await octokit.request("/user");
	} catch (error) {
		octoAuthSpinner.stopAndPersist({ symbol: chalk.yellow("⠿") });

		if (error.message === "Bad credentials") {
			ora({
				indent: 2,
				text: chalk.red("Bad credentials!")
			})
				.start()
				.fail();
		} else {
			ora({
				indent: 2,
				text: chalk.red(`Error: ${error.name}, Message: ${error.message}!`)
			})
				.start()
				.fail();
		}

		process.exit(1);
	}

	octoAuthSpinner.stopAndPersist({ symbol: chalk.yellow("⠿") });

	ora({
		indent: 2,
		text: chalk.green("Client initialized!")
	})
		.start()
		.succeed();

	console.log("");

	await delay(100);

	let USERNAME = null;

	while (!USERNAME) {
		const usernameInput = readlineSync.question(
			chalk.yellow(
				"  + Type the Github user whose recent events history" +
					"\n  you would like to view then hit enter: "
			)
		);

		const verifySpinner = ora({
			text: chalk.cyan(`Verifying existence of user "${usernameInput}"`),
			color: "cyan",
			indent: 4
		}).start();

		try {
			const result = await octokit.users.getByUsername({
				username: usernameInput
			});

			if (result.data === null) {
				throw new Error("Not Found");
			}

			USERNAME = result.data.login;
		} catch (error) {
			verifySpinner.stopAndPersist({ symbol: chalk.cyan("⠿") });

			if (error.message === "Not Found") {
				ora({
					indent: 6,
					text: chalk.red(`${usernameInput} does not exist!`)
				})
					.start()
					.fail();
			} else {
				ora({
					indent: 6,
					text: chalk.red(`Error: ${error.name}, Message: ${error.message}!`)
				})
					.start()
					.fail();
			}
		}

		if (USERNAME !== null) {
			verifySpinner.stopAndPersist({ symbol: chalk.cyan("⠿") });

			ora({
				indent: 6,
				text: chalk.green(`${usernameInput} exists!`)
			})
				.start()
				.succeed();
		}
	}

	console.log("");

	const fetchSpinner = ora({
		text: chalk.yellow(`Fetching recent event data for ${USERNAME}`),
		color: "yellow"
	}).start();

	await delay(250);

	let results;

	try {
		results = await octokit.activity.listPublicEventsForUser({
			username: USERNAME
		});
	} catch (error) {
		fetchSpinner.stopAndPersist({ symbol: chalk.yellow("⠿") });

		ora({
			indent: 2,
			text: chalk.red(`Error: ${error.name}, Message: ${error.message}!`)
		})
			.start()
			.fail();

		process.exit(1);
	}

	fetchSpinner.stopAndPersist({ symbol: chalk.yellow("⠿") });

	ora({
		indent: 2,
		text: chalk.green("Event data acquired!")
	})
		.start()
		.succeed();

	await delay(250);

	console.log("");

	const printSpinner = ora({
		text: chalk.yellow(`Pretty printing data to ${__dirname}/events.json`),
		color: "yellow"
	}).start();

	await delay(500);

	printSpinner.stopAndPersist({ symbol: chalk.yellow("⠿") });

	try {
		const { data: events } = results;

		const json = JSON.stringify({ events }, null, 1);

		fs.writeFileSync("events.json", json);

		ora({
			indent: 2,
			text: chalk.green("Printed events data!")
		})
			.start()
			.succeed();

		process.exit(0);
	} catch (error) {
		ora({
			indent: 2,
			text: chalk.red(`Error: ${error.name}, Message: ${error.message}!`)
		})
			.start()
			.fail();
	}
})();
