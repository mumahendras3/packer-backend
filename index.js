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

schedule.scheduleJob(process.env.REPOS_CHECK_FREQUENCY, async function () {
  console.log(new Date(), "Checking for updates for all repos");

  const users = await User.find().populate("watchList", "-__v");

  users.forEach(async (user) => {
    user.watchList.forEach(async (repo) => {
      const dataGithub = await axios({
        url: repo.githubReleasesEndpoint + "/latest",
      });
      if (dataGithub.data.name !== repo.latestVersion) {
        repo.latestVersion = dataGithub.data.name;
        repo.latestReleaseAssets = dataGithub.data.assets.map((asset) => ({
          name: asset.name,
          url: asset.browser_download_url,
        }));
        await repo.save();
        console.log(user.email, "masuk email");
        nodeMailer(
          user.email,
          `New Update for ${repo.ownerName}/${repo.name}`,
          `<!DOCTYPE html>
          <html lang="en">
          
          <head>
             <meta charset="UTF-8">
             <meta http-equiv="X-UA-Compatible" content="IE=edge">
             <meta name="viewport" content="width=device-width, initial-scale=1.0">
             <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap"
                rel="stylesheet">
             <title>Document</title>
          </head>
          
          <body style="font-family: 'Plus Jakarta Sans', sans-serif; width: 100%;">
             <div id="paper"
                style="background-color: white; width: 80%; margin: auto; border: 1px solid rgb(232, 232, 232); padding: 10px;">
                <div id="header"
                   style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #F2F2F2; box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.05); border-radius: 10px; margin: 20px; padding: 20px;">
                   <div id="img" style="width: 50%;">
                      <img
                         src="https://media.discordapp.net/attachments/1079821583255875728/1105074586925682788/Mail_sent-pana.png?width=1030&height=1030"
                         width="80%" alt="">
                   </div>
                   <div id="title" style="width: 50%;">
                      <h1 style="font-weight: 600; width: 80%;">INFORMATION EMAIL</h1>
                      <hr>
                      <p>Subject: New Update for ${repo.ownerName}/${repo.name} : ${repo.currentVersion} -> ${repo.latestVersion} Latest Update on Repository</p>
                      <p>Dear ${user.email}</p>
                   </div>
                </div>
                <div id="contentEmail" style="padding: 20px;">
                   <p style="font-size: larger;">
                      I wanted to let you know that the repository you're following, ${repo.name}, has a new realese: ${repo.latestVersion}
                      <br> <br>
                      You can start a new task by visiting the tasklist page here   
                      <br> <br>
                      Have a nice day!
                   </p>
                </div>
                <div id="footer" style="background-color: #001462; padding: 15px 20px; border-radius: 10px;">
                   <div id="contentFooter" style="display: flex; align-items: center; justify-content: space-between;">
                      <img
                         src="https://media.discordapp.net/attachments/1079821583255875728/1105086419648651264/logoWhite.png?width=300&height=70"
                         alt="">
                   </div>
                </div>
             </div>
          </body>
          
          </html>`
        );
      }
    });
  });
});

schedule.scheduleJob(process.env.TASKS_CHECK_FREQUENCY, async function () {
  const query = {
    status: {
      $eq: "Running",
    },
  };
  const task = await Task.find(query).populate("user");

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
    nodeMailer(
      task.user.email,
      `Task ${task._id} - ${task.status}`,
      `<!DOCTYPE html>
    <html lang="en">
    
    <head>
       <meta charset="UTF-8">
       <meta http-equiv="X-UA-Compatible" content="IE=edge">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap"
          rel="stylesheet">
       <title>Document</title>
    </head>
    
    <body style="font-family: 'Plus Jakarta Sans', sans-serif; width: 100%;">
       <div id="paper"
          style="background-color: white; width: 80%; margin: auto; border: 1px solid rgb(232, 232, 232); padding: 10px;">
          <div id="header"
             style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #F2F2F2; box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.05); border-radius: 10px; margin: 20px; padding: 20px;">
             <div id="img" style="width: 50%;">
                <img
                   src="https://media.discordapp.net/attachments/1079821583255875728/1105074586925682788/Mail_sent-pana.png?width=1030&height=1030"
                   width="80%" alt="">
             </div>
             <div id="title" style="width: 50%;">
                <h1 style="font-weight: 600; width: 80%;">INFORMATION EMAIL</h1>
                <hr>
                <p>Subject:Task Status Update </p>
                <p>Dear ${task.user.name}</p>
             </div>
          </div>
          <div id="contentEmail" style="padding: 20px;">
             <p style="font-size: larger;">
                I would like to inform you that the status of the task with id ${task._id} has been confirmed to be 
                <span style="background-color: #001462; color: white;">${task.status}</span>. We would like to provide
                further information regarding the status.
                <br> <br>
              For more details please click here 
                <br> <br>
                For more information, please visit <span style="background-color: #001462; color: white;"></span> for
                complete details. Please do not hesitate
                to contact us
                if you need further assistance.
                <br> <br>
                Thank you
             </p>
          </div>
          <div id="footer" style="background-color: #001462; padding: 15px 20px; border-radius: 10px;">
             <div id="contentFooter" style="display: flex; align-items: center; justify-content: space-between;">
                <img
                   src="https://media.discordapp.net/attachments/1079821583255875728/1105086419648651264/logoWhite.png?width=300&height=70"
                   alt="">
                <span style="color: white;">copyright© 2023 by Packer</span>
             </div>
          </div>
       </div>
    </body>
    
    </html>`
    );
  }
});

app.listen(PORT, () => {
  console.log("Packer server is listening on port", PORT);
});
