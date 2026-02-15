export class NeuralNetLoss {
  // Cross-entropy on action prediction
  actionLoss(predicted: number[], target: number): number {
    return -Math.log(predicted[target] + 1e-8);
  }

  // MSE on need change prediction
  outcomeLoss(predictedNeeds: number[], actualNeeds: number[]): number {
    let sum = 0;
    for (let i = 0; i < predictedNeeds.length; i++) {
      sum += (predictedNeeds[i] - actualNeeds[i]) ** 2;
    }
    return sum / predictedNeeds.length;
  }

  // Emotion regularization
  emotionRegularization(emotionalState: number[], needs: number[]): number {
    const avgNeed = needs.reduce((a, b) => a + b, 0) / needs.length;
    // Map needs [0,1] to valence [-1,1]
    const valenceLoss = (emotionalState[0] - (avgNeed * 2 - 1)) ** 2;
    return valenceLoss * 0.1;
  }

  // Total loss
  total(
    actionPred: number[], actionTarget: number,
    emotionalState: number[], needs: number[],
    outcomePred?: number[], outcomeActual?: number[]
  ): number {
    let loss = this.actionLoss(actionPred, actionTarget);
    if (outcomePred && outcomeActual) {
      loss += this.outcomeLoss(outcomePred, outcomeActual) * 0.3;
    }
    loss += this.emotionRegularization(emotionalState, needs) * 0.1;
    return loss;
  }
}
