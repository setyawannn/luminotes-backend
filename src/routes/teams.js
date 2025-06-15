const express = require("express");
const teamController = require("../controllers/teamController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/", teamController.getAllTeams);
router.get("/:id", teamController.getTeamById);
router.post("/", teamController.createTeam);
router.put("/:id", teamController.updateTeam);
router.delete("/:id", teamController.deleteTeam);

router.post("/join", teamController.joinTeam);
router.delete("/:teamId/leave", teamController.leaveTeam);
router.delete("/:teamId/members/:memberId", teamController.removeMember);

module.exports = router;
