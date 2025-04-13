import { Router } from "express";
import connectionPool from "../utils/db.mjs";

const questionsRouter = Router();

questionsRouter.post("/", async (req, res) => {
  const newQuestion = {
    ...req.body,
  };

  if (!newQuestion.title) {
    return res.status(400).json({
      message: "Invalid request data.",
    });
  }
  try {
    await connectionPool.query(
      "INSERT INTO questions (title, description, category) VALUES ($1, $2, $3)",
      [newQuestion.title, newQuestion.description, newQuestion.category]
    );
    return res.status(201).json({
      message: "Question created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to create question.",
    });
  }
});

questionsRouter.get("/", async (req, res) => {
  try {
    const result = await connectionPool.query("SELECT * FROM questions");
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to fetch questions.",
    });
  }
});

questionsRouter.get("/search", async (req, res) => {
  const { title, category } = req.query;

  let baseQuery = "SELECT * FROM questions WHERE 1=1";
  let queryParams = [];
  let index = 1;

  if (title) {
    baseQuery += ` AND title ILIKE $${index}`;
    queryParams.push(`%${title}%`);
    index++;
  }

  if (category) {
    baseQuery += ` AND category ILIKE $${index}`;
    queryParams.push(`%${category}%`);
    index++;
  }

  try {
    const result = await connectionPool.query(baseQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No questions found.",
      });
    }

    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to fetch questions.",
    });
  }
});

questionsRouter.get("/:questionsId", async (req, res) => {
  const questionsId = req.params.questionsId;
  try {
    const result = await connectionPool.query(
      "SELECT * FROM questions WHERE id = $1",
      [questionsId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Question not found.",
      });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to fetch question.",
    });
  }
});

questionsRouter.put("/:questionsId", async (req, res) => {
  const questionsId = req.params.questionsId;
  const updatedQuestion = { ...req.body };

  if (!updatedQuestion.title) {
    return res.status(400).json({
      message: "Invalid request data.",
    });
  }

  try {
    const result = await connectionPool.query(
      "UPDATE questions SET title = $1, description = $2, category = $3 WHERE id = $4",
      [
        updatedQuestion.title,
        updatedQuestion.description,
        updatedQuestion.category,
        questionsId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Question not found.",
      });
    }

    return res.status(200).json({
      message: "Question updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to update question.",
    });
  }
});

questionsRouter.delete("/:questionsId", async (req, res) => {
  const questionsId = req.params.questionsId;

  try {
    const result = await connectionPool.query(
      "DELETE FROM questions WHERE id = $1",
      [questionsId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Question not found.",
      });
    }

    return res.status(200).json({
      message: "Question post has been deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to delete question.",
    });
  }
});

questionsRouter.post("/:questionsId/answers", async (req, res) => {
  const questionsId = req.params.questionsId;
  const newAnswer = req.body.content;

  if (!newAnswer || newAnswer.length > 300) {
    return res.status(400).json({
      message: "Invalid request data.",
    });
  }

  try {
    const result = await connectionPool.query(
      "INSERT INTO answers (question_id, content) VALUES ($1, $2)",
      [questionsId, newAnswer]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Question not found.",
      });
    }

    return res.status(201).json({
      message: "Answer created successfully",
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(404).json({
        message: "Question not found.",
      });
    }
    return res.status(500).json({
      error: error.message,
      message: "Unable to create answer.",
    });
  }
});

questionsRouter.get("/:questionsId/answers", async (req, res) => {
  const questionsId = req.params.questionsId;

  try {
    const result = await connectionPool.query(
      "SELECT * FROM answers WHERE question_id = $1",
      [questionsId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No answers found for this question.",
      });
    }

    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to fetch answers.",
    });
  }
});

questionsRouter.delete("/:questionsId/answers", async (req, res) => {
  const questionsId = req.params.questionsId;

  try {
    const result = await connectionPool.query(
      "DELETE FROM answers WHERE question_id = $1",
      [questionsId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Answer not found.",
      });
    }

    return res.status(200).json({
      message: "Answer deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to delete answer.",
    });
  }
});

questionsRouter.post("/:questionId/vote", async (req, res) => {
  const questionId = req.params.questionId;
  const newVote = req.body.vote; // 1 for upvote, -1 for downvote
  if (newVote !== 1 && newVote !== -1) {
    return res.status(400).json({
      message: "Invalid request data.",
    });
  }

  try {
    const result = await connectionPool.query(
      "INSERT INTO question_votes (question_id, vote) VALUES ($1, $2)",
      [questionId, newVote]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Question not found.",
      });
    }

    return res.status(201).json({
      message: "Vote added successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to add vote.",
    });
  }
});

questionsRouter.post("/answers/:answerId/vote", async (req, res) => {
  const answerId = parseInt(req.params.answerId, 10);
  const newVote = req.body.vote; // 1 สำหรับ upvote, -1 สำหรับ downvote

  if (isNaN(answerId) || (newVote !== 1 && newVote !== -1)) {
    return res.status(400).json({
      message: "Invalid request data.",
    });
  }

  try {
    // ตรวจสอบว่า answerId มีอยู่ในฐานข้อมูลหรือไม่
    const answerCheck = await connectionPool.query(
      "SELECT id FROM answers WHERE id = $1",
      [answerId]
    );

    if (answerCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Answer not found.",
      });
    }

    // เพิ่มโหวตลงในตาราง answer_votes
    await connectionPool.query(
      "INSERT INTO answer_votes (answer_id, vote) VALUES ($1, $2)",
      [answerId, newVote]
    );

    return res.status(201).json({
      message: "Vote added successfully",
    });
  } catch (error) {
    // จัดการข้อผิดพลาด Foreign Key
    if (error.code === "23503") {
      return res.status(404).json({
        message: "Answer not found.",
      });
    }

    return res.status(500).json({
      error: error.message,
      message: "Unable to add vote.",
    });
  }
});

export default questionsRouter;
