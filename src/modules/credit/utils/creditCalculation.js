export function creditCalculation({ requestedAmount, term, annualInterestRate, managementFees }) {
    let monthlyInterestRate = annualInterestRate / 12;
    monthlyInterestRate = monthlyInterestRate.toFixed(2);

    const totalInterest = parseInt(requestedAmount * (annualInterestRate / 100) * (term / 12));
    const totalToPay = parseInt(requestedAmount + totalInterest);
    const monthlyPayment = parseInt(totalToPay / term + managementFees);

    return { monthlyPayment, totalToPay, totalInterest, monthlyInterestRate, managementFees };
}
