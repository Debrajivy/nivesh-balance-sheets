export const assets = [
  ["HDFC Savings · 0284","Bank & cash","Rajiv","₹42.81 L","₹42.81 L","Fresh","HDFC_Statement_Jul26.pdf · p.14"],
  ["Listed equity portfolio","Listed investments","Rajiv","₹7.19 Cr","₹12.84 Cr","Fresh","NSDL_CAS_July26.pdf · p.8"],
  ["Mutual fund portfolio","Listed investments","Anjali","₹5.01 Cr","₹6.84 Cr","Fresh","CAMS_CAS_July26.pdf · p.3"],
  ["Malabar Hill residence","Real estate","Joint","₹4.20 Cr","₹11.50 Cr","Ageing","KnightFrank_Valuation.pdf · p.6"],
  ["Malhotra Ventures · 74%","Unlisted & private","Rajiv","₹74.00 L","₹5.80 Cr","Ageing","MVPL_Valuation_FY26.pdf · p.22"],
  ["PPF account","Retirement & savings","Anjali","₹38.20 L","₹38.20 L","Fresh","SBI_PPF_FY26.pdf · p.1"],
  ["Gold & jewellery","Physical & other","Anjali","₹48.00 L","₹1.26 Cr","Stale","Principal declaration · Nov 2024"],
  ["Loan to A. Malhotra","Loans given","Rajiv","₹85.00 L","₹85.00 L","Ageing","Loan_Agreement_AM.pdf · cl.4"],
  ["Singapore bank account","Foreign assets","Rajiv","₹31.40 L","₹31.40 L","Fresh","DBS_July26.pdf · p.2 · RBI rate"],
];
export const liabilities = [
  ["HDFC Home Loan · 8841","Home & property loans","Rajiv","₹2.86 Cr","Fresh","HDFC_Loan_Jul26.pdf · p.2"],
  ["Kotak loan against securities","LAS & personal loans","Rajiv","₹91.50 L","Fresh","Kotak_LAS_Aug26.pdf · p.1"],
  ["Director guarantee exposure","Business & director liabilities","Rajiv","₹1.20 Cr","Ageing","MVPL_Audited_FY26.pdf · n.31"],
  ["Advance tax payable","Taxes & dues","Rajiv","₹22.50 L","Fresh","Tax_Working_Q2.xlsx · B42"],
];
export const documents = [
  ["NSDL_CAS_July26.pdf","Rajiv","Upload","22 pages","12 figures","Processed","10 Aug, 9:42 AM"],
  ["HDFC_Statement_Jul26.pdf","Rajiv","Email","18 pages","8 figures","Needs review","9 Aug, 3:15 PM"],
  ["CAMS_CAS_July26.pdf","Anjali","Upload","9 pages","17 figures","Processed","8 Aug, 11:28 AM"],
  ["Tax_Working_Q2.xlsx","Rajiv","Upload","4 sheets","3 figures","Processed","7 Aug, 5:02 PM"],
  ["Gold_Declaration.jpg","Anjali","Upload","1 image","1 figure","Stale","12 Nov 2024"],
];
export const obligations = [
  ["OVERDUE","BMC property tax · Worli","Rajiv","₹4.20 L","BMC_Demand_FY26.pdf","Interest accruing"],
  ["12 AUG","HDFC Life term renewal","Rajiv","₹2.84 L","HDFC_Life_Schedule.pdf","2 days"],
  ["15 SEP","Advance tax · Q2 instalment","Rajiv","₹1.12 Cr","Tax_Working_Q2.xlsx","36 days"],
  ["30 SEP","Home loan EMI","Rajiv","₹3.85 L","HDFC_Loan_Jul26.pdf","51 days"],
  ["04 OCT","AIF capital call","HUF","₹15.00 L","AIF_Drawdown_Notice.pdf","56 days"],
];
export const taxFlags = [
  ["Compliance","Foreign asset disclosure needs verification","Singapore bank account appears in documents but is not mapped to Schedule FA.","FA-3 · Income-tax Rules Table v2026.04","₹4.20 L exposure"],
  ["Opportunity","Review capital-loss harvesting","Eligible carried-forward losses may offset realised gains, subject to CA review.","CG-12 · Rules Table v2026.04","₹6.80 L at stake"],
  ["Watch","Property value differs materially from cost","Estimated value is 2.7× documented acquisition cost; both bases must remain visible.","RE-2 · Valuation policy v3","CA conversation"],
];
