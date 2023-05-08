if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const PORT = process.env.PORT || 3000;
const app = require("./app");
const schedule = require("node-schedule");
const { nodeMailer } = require("./helpers/nodemailer");
const { default: axios } = require("axios");
const User = require("./models/user");
const Task = require("./models/task");
const client = require("./config/harbor-master");

// schedule.scheduleJob(process.env.REPOS_CHECK_FREQUENCY, async function () {
//   console.log(new Date(), "Checking for updates for all repos");

//   const users = await User.find().populate("watchList", "-__v");

//   users.forEach(async (user) => {
//     user.watchList.forEach(async (repo) => {
//       const dataGithub = await axios({
//         url: repo.githubReleasesEndpoint + "/latest",
//       });
//       if (dataGithub.data.name !== repo.latestVersion) {
//         repo.latestVersion = dataGithub.data.name;
//         repo.latestReleaseAssets = dataGithub.data.assets.map((asset) => ({
//           name: asset.name,
//           url: asset.browser_download_url,
//         }));
//         await repo.save();
//         nodeMailer(
//           user.email,
//           `New Update for ${repo.ownerName}/${repo.name}`,
//           `<h1>New Update for ${repo.ownerName}/${repo.name}: ${repo.currentVersion} -> ${repo.latestVersion}<h1>`
//         );
//       }
//     });
//   });
// });

schedule.scheduleJob(process.env.TASKS_CHECK_FREQUENCY, async function () {
  const query = {
    status: {
      $eq: "Running",
    },
  };
  const task = await Task.find(query);

  for (let i = 0; i < task.length; i++) {
    const idContainer = task[i].containerId;
    const inspect = await client.containers().inspect(idContainer);
    console.log(new Date(), "Check task every 5 min");
    if (inspect.State.Status === "exited") {
      if (inspect.State.ExitCode === 0) {
        task[i].status = "Succeeded";
        await task[i].save();
      } else {
        task[i].status = "Failed";
        await task[i].save();
      }
    }
  }
});

app.listen(PORT, () => {
  console.log("Packer server is listening on port", PORT);
});
