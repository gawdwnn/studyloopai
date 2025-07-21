// Sample Open Questions data for development and testing
// In production, this would be replaced with data from the database

import type { OpenQuestion } from "@/stores/open-question-session/types";

export const SAMPLE_OPEN_QUESTIONS: OpenQuestion[] = [
	{
		id: "1",
		question:
			"Explain why predictability is emphasized as important for agents and provide an example of how unpredictable agent behavior could cause problems.",
		sampleAnswer:
			"Predictability in agent systems ensures that outputs are consistent and reliable, which is crucial for building trust and maintaining system stability. For example, if an agent responsible for financial transactions behaves unpredictably, it could make unauthorized trades or miscalculate amounts, leading to significant financial losses and legal complications.",
		difficulty: "medium",
		source: "Practical guide to building agents.pdf",
		week: "Week 2",
		topic: "Agent Systems",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "2",
		question:
			"What new category of systems has been unlocked by advances in reasoning, multimodality, and tool use in large language models? Describe the key characteristics that define this category.",
		sampleAnswer:
			"Agents have been unlocked by these advances. These systems are characterized by their ability to reason about problems, process multiple types of input (text, images, audio), and interact with external tools and environments. Unlike traditional AI systems that simply respond to queries, agents can plan, execute multi-step tasks, and adapt their behavior based on feedback from their environment.",
		difficulty: "easy",
		source: "Practical guide to building agents.pdf",
		week: "Week 2",
		topic: "Agent Systems",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "3",
		question:
			"Compare and contrast the transformer architecture with RNNs, focusing on their primary advantages and disadvantages.",
		sampleAnswer:
			"Transformers offer parallel processing capabilities, allowing them to process entire sequences simultaneously rather than sequentially like RNNs. This makes training much faster and more efficient. However, transformers have higher memory requirements and computational complexity for very long sequences. RNNs are more memory-efficient for sequential processing but suffer from vanishing gradients and slower training due to their sequential nature.",
		difficulty: "medium",
		source: "Neural Networks Fundamentals.pdf",
		week: "Week 1",
		topic: "General",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "4",
		question:
			"In design thinking, what is the purpose of the empathy phase and how does it influence the subsequent phases?",
		sampleAnswer:
			"The empathy phase focuses on understanding users' experiences, emotions, and motivations to inform the design process. It involves observing, interviewing, and immersing yourself in the user's environment to gain deep insights into their needs and pain points. This understanding directly influences the Define phase by helping identify the right problems to solve, the Ideate phase by ensuring solutions address real user needs, and the Prototype and Test phases by providing criteria for evaluation.",
		difficulty: "easy",
		source: "Using design thinking to solve everyday problem.pdf",
		week: "Week 3",
		topic: "Design Thinking",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "5",
		question:
			"Explain the concept of fine-tuning in machine learning and discuss when it would be preferable to training a model from scratch.",
		sampleAnswer:
			"Fine-tuning involves taking a pre-trained model and continuing training on task-specific data to specialize it for a particular application. It's preferable to training from scratch when you have limited data, computational resources, or time, as the pre-trained model already contains learned representations that can be adapted. Fine-tuning is particularly effective when the new task is related to the original training domain, allowing the model to leverage existing knowledge while adapting to new requirements.",
		difficulty: "medium",
		source: "Advanced AI Architectures.pdf",
		week: "Week 4",
		topic: "General",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "6",
		question:
			"Describe the attention mechanism in neural networks and explain how it improves model performance on sequence-to-sequence tasks.",
		sampleAnswer:
			"The attention mechanism allows neural networks to selectively focus on different parts of the input sequence when generating each output token. Instead of relying solely on a fixed-size context vector, attention computes weighted averages of all input representations, allowing the model to dynamically decide which parts of the input are most relevant for each prediction. This significantly improves performance on sequence-to-sequence tasks by addressing the information bottleneck problem and enabling better handling of long sequences.",
		difficulty: "hard",
		source: "Neural Networks Fundamentals.pdf",
		week: "Week 1",
		topic: "General",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "7",
		question:
			"What is backpropagation and why is it fundamental to training neural networks? Include a brief explanation of how gradients are computed.",
		sampleAnswer:
			"Backpropagation is the algorithm used to train neural networks by calculating gradients of the loss function with respect to network weights. It works by applying the chain rule of calculus to propagate error gradients backward through the network layers. Starting from the output layer's error, gradients are computed layer by layer, moving backward to the input. These gradients indicate how much each weight contributes to the overall error, allowing the optimization algorithm to adjust weights in the direction that minimizes loss.",
		difficulty: "hard",
		source: "Neural Networks Fundamentals.pdf",
		week: "Week 1",
		topic: "General",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "8",
		question:
			"Explain what embeddings are in the context of large language models and discuss their significance in natural language processing.",
		sampleAnswer:
			"Embeddings are dense vector representations that capture semantic meaning and relationships between words, phrases, or other data in a continuous vector space. In LLMs, embeddings transform discrete tokens into numerical vectors that the model can process. They're significant because they encode semantic similarity—words with similar meanings have similar vector representations. This allows models to understand relationships between concepts, perform analogical reasoning, and generalize to unseen word combinations.",
		difficulty: "easy",
		source: "Practical guide to building LLMs.pdf",
		week: "Week 2",
		topic: "General",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "9",
		question:
			"Describe gradient descent and explain how it helps optimize neural network parameters. What are some common variants and their advantages?",
		sampleAnswer:
			"Gradient descent is an optimization algorithm that iteratively adjusts model parameters in the direction that minimizes the loss function. It computes gradients of the loss with respect to parameters and updates them proportionally to the negative gradient. Common variants include SGD (stochastic), which uses mini-batches for faster training; Adam, which adapts learning rates per parameter and includes momentum; and RMSprop, which uses moving averages of squared gradients to normalize updates. Each variant addresses different challenges like convergence speed, stability, and computational efficiency.",
		difficulty: "medium",
		source: "Neural Networks Fundamentals.pdf",
		week: "Week 1",
		topic: "General",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
	{
		id: "10",
		question:
			"What is tokenization in natural language processing and why is it important for language models? Discuss different tokenization strategies.",
		sampleAnswer:
			"Tokenization is the process of converting text into smaller units (tokens) that can be processed by machine learning models. It's crucial for language models because it determines how text is represented numerically. Common strategies include word-level tokenization (splitting by spaces/punctuation), character-level (individual characters), and subword tokenization like BPE (Byte Pair Encoding) or SentencePiece. Subword methods are popular because they balance vocabulary size with semantic meaning, handling out-of-vocabulary words while maintaining meaningful units.",
		difficulty: "easy",
		source: "Practical guide to building LLMs.pdf",
		week: "Week 2",
		topic: "General",
		timesSeen: 0,
		timesAnswered: 0,
		averageScore: 0,
		averageWordCount: 0,
		averageResponseTime: 0,
	},
];
