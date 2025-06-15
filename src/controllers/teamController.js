const db = require("../config/database");
const ApiResponse = require("../utils/response");
const { generateUniqueCode } = require("../utils/codeGenerator");

class TeamController {
  async getAllTeams(req, res) {
    try {
      const userId = req.user.id;

      const [teams] = await db.execute(
        `
      SELECT
        t.id,
        t.name,
        t.description,
        t.code,
        t.created_at
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
      ORDER BY t.created_at DESC
      `,
        [userId]
      );

      return ApiResponse.success(res, teams, "Teams retrieved successfully");
    } catch (error) {
      console.error("Get All Teams error:", error);
      return ApiResponse.error(res, "Failed to retrieve teams");
    }
  }

  async getTeamById(req, res) {
    try {
      const { id: teamId } = req.params;
      const userId = req.user.id;

      if (!teamId || isNaN(teamId)) {
        return ApiResponse.badRequest(res, "Invalid team ID provided");
      }

      const [teams] = await db.execute(
        `
      SELECT t.id, t.name, t.description, t.code, t.created_at, t.updated_at
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE t.id = ? AND tm.user_id = ?
      `,
        [teamId, userId]
      );

      if (teams.length === 0) {
        return ApiResponse.notFound(
          res,
          "Team not found or you do not have permission to view it"
        );
      }

      const teamData = teams[0];

      const [members] = await db.execute(
        `
      SELECT u.id, u.name, u.email, tm.role
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY FIELD(tm.role, 'leader', 'member'), u.name
      `,
        [teamId]
      );

      const responseData = {
        ...teamData,
        members: members,
      };

      return ApiResponse.success(
        res,
        responseData,
        "Team retrieved successfully"
      );
    } catch (error) {
      console.error("Get Team by ID error:", error);
      return ApiResponse.error(res, "Failed to retrieve team");
    }
  }

  async createTeam(req, res) {
    let connection;
    try {
      const { name, description } = req.body;
      const userId = req.user.id;

      if (!name || name.length < 2 || name.length > 255) {
        return ApiResponse.badRequest(
          res,
          "Name must be between 2 and 255 characters"
        );
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const uniqueCode = await generateUniqueCode(connection);

      const [teamResult] = await connection.execute(
        "INSERT INTO teams (name, description, code) VALUES (?, ?, ?)",
        [name, description || null, uniqueCode]
      );
      const newTeamId = teamResult.insertId;

      await connection.execute(
        "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'leader')",
        [newTeamId, userId]
      );

      await connection.commit();

      const [newTeamData] = await connection.execute(
        `SELECT id, name, description, code, created_at, updated_at FROM teams WHERE id = ?`,
        [newTeamId]
      );
      const [leaderData] = await connection.execute(
        `SELECT id, name, email FROM users WHERE id = ?`,
        [userId]
      );

      const responseData = {
        ...newTeamData[0],
        members: [{ ...leaderData[0], role: "leader" }],
      };

      return ApiResponse.created(
        res,
        responseData,
        "Team created successfully"
      );
    } catch (error) {
      if (connection) await connection.rollback();

      console.error("Create Team error:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return ApiResponse.badRequest(
          res,
          "A team with this name or code already exists."
        );
      }
      return ApiResponse.error(res, "Failed to create team");
    } finally {
      if (connection) connection.release();
    }
  }

  async updateTeam(req, res) {
    try {
      const { id: teamId } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;

      if (!name || name.length < 2 || name.length > 255) {
        return ApiResponse.badRequest(
          res,
          "Name must be between 2 and 255 characters"
        );
      }

      const [members] = await db.execute(
        "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
      );

      if (members.length === 0 || members[0].role !== "leader") {
        return ApiResponse.forbidden(
          res,
          "You must be the team leader to edit this team"
        );
      }

      await db.execute(
        "UPDATE teams SET name = ?, description = ? WHERE id = ?",
        [name, description || null, teamId]
      );

      const [updatedTeamData] = await db.execute(
        "SELECT * FROM teams WHERE id = ?",
        [teamId]
      );

      return ApiResponse.success(
        res,
        updatedTeamData[0],
        "Team updated successfully"
      );
    } catch (error) {
      console.error("Update Team error:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return ApiResponse.badRequest(
          res,
          "A team with this name already exists."
        );
      }
      return ApiResponse.error(res, "Failed to update team");
    }
  }

  async deleteTeam(req, res) {
    try {
      const { id: teamId } = req.params;
      const userId = req.user.id;

      const [members] = await db.execute(
        "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
      );

      if (members.length === 0 || members[0].role !== "leader") {
        return ApiResponse.forbidden(
          res,
          "You must be the team leader to delete this team"
        );
      }

      await db.execute("DELETE FROM teams WHERE id = ?", [teamId]);

      return ApiResponse.success(res, null, "Team deleted successfully");
    } catch (error) {
      console.error("Delete Team error:", error);
      return ApiResponse.error(res, "Failed to delete team");
    }
  }

  async joinTeam(req, res) {
    try {
      const { code } = req.body;

      const userId = req.user.id;

      if (!code) {
        return ApiResponse.badRequest(res, "Team code is required.");
      }

      const [teams] = await db.execute("SELECT id FROM teams WHERE code = ?", [code]);
      if (teams.length === 0) {
        return ApiResponse.notFound(res, "Invalid team code.");
      }
      const teamId = teams[0].id;

      const [existingMembers] = await db.execute(
        "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
      );
      if (existingMembers.length > 0) {
        return ApiResponse.badRequest(res, "You are already a member of this team.");
      }

      await db.execute(
        "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'member')",
        [teamId, userId]
      );

      return ApiResponse.success(res, { teamId: teamId }, "Successfully joined the team.");
    } catch (error) {
      console.error("Join Team error:", error);
      return ApiResponse.error(res, "Failed to join team.");
    }
  }

  async removeMember(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const requesterId = req.user.id;

      if (requesterId.toString() === memberId.toString()) {
        return ApiResponse.badRequest(res, "You cannot remove yourself.");
      }

      const [requesterRole] = await db.execute(
        "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, requesterId]
      );
      if (requesterRole.length === 0 || requesterRole[0].role !== 'leader') {
        return ApiResponse.forbidden(res, "Only the team leader can remove members.");
      }

      const [targetMember] = await db.execute(
        "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, memberId]
      );
      if (targetMember.length === 0) {
        return ApiResponse.notFound(res, "Member not found in this team.");
      }

      await db.execute(
        "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, memberId]
      );

      return ApiResponse.success(res, null, "Member removed successfully.");
    } catch (error) {
      console.error("Remove Member error:", error);
      return ApiResponse.error(res, "Failed to remove member.");
    }
  }

  async leaveTeam(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;

      const [[userRole], [memberCount]] = await Promise.all([
        db.execute("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?", [teamId, userId]),
        db.execute("SELECT COUNT(*) as count FROM team_members WHERE team_id = ?", [teamId])
      ]);

      if (userRole.length === 0) {
        return ApiResponse.notFound(res, "You are not a member of this team.");
      }

      if (userRole[0].role === 'leader' && memberCount[0].count === 1) {
        return ApiResponse.badRequest(res, "You are the last member and the leader. Please delete the team instead of leaving.");
      }

      await db.execute("DELETE FROM team_members WHERE team_id = ? AND user_id = ?", [teamId, userId]);

      return ApiResponse.success(res, null, "You have successfully left the team.");
    } catch (error) {
      console.error("Leave Team error:", error);
      return ApiResponse.error(res, "Failed to leave team.");
    }
  }
}

module.exports = new TeamController();
