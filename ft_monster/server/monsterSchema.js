const properties = [
    {
      "label":"@jobAction",
      "name": "@jobAction",
      "type": "string"
    },
    {
      "label":"@jobRefCode",
      "name": "@jobRefCode",
      "type": "string"
    },
    {
      "label":"JobInformation",
      "name": "JobInformation",
      "type": "object",
      "properties": [
          {
              "label":"JobBody",
              "name": "JobBody",
              "type": "string"
          },
          {
              "label":"JobTitle",
              "name": "JobTitle",
              "type": "string"
          },
          {
              "label":"JobLevel",
              "name": "JobLevel",
              "type": "object",
              "properties": [
                  {
                      "label":"@monsterId",
                      "name": "@monsterId",
                      "type": "string"
                  }
              ]
          },
          {
              "label":"JobType",
              "name": "JobType",
              "type": "object",
              "properties": [
                  {
                      "label":"@monsterId",
                      "name": "@monsterId",
                      "type": "string"
                  }
              ]
          },
          {
              "label":"JobStatus",
              "name": "JobStatus",
              "type": "object",
              "properties": [
                  {
                      "label":"@monsterId",
                      "name": "@monsterId",
                      "type": "string"
                  }
              ]
          },
          {
              "label":"Salary",
              "name": "Salary",
              "type": "object",
              "properties": [
                  {
                      "label":"SalaryMin",
                      "name": "SalaryMin",
                      "type": "string"
                  },
                  {
                      "label":"SalaryMax",
                      "name": "SalaryMax",
                      "type": "string"
                  },
                  {
                      "label":"Currency",
                      "name": "Currency",
                      "type": "object",
                      "properties": [
                          {
                              "label":"@monsterId",
                              "name": "@monsterId",
                              "type": "string"
                          }
                      ]
                  }
              ]
          }
      ]
    },
    {
      "label":"JobPostings",
      "name": "JobPostings",
      "type": "object",
      "properties": [
          {
              "label":"JobPosting",
              "name": "JobPosting",
              "type": "object",
              "properties": [
                  {
                      "label":"@desiredDuration",
                      "name": "@desiredDuration",
                      "type": "string"
                  },
                  {
                      "label":"JobCategory",
                      "name": "JobCategory",
                      "type": "object",
                      "properties": [
                          {
                              "label":"@monsterId",
                              "name": "@monsterId",
                              "type": "string"
                          }
                      ]
                  },
                  {
                      "label":"BoardName",
                      "name": "BoardName",
                      "type": "object",
                      "properties": [
                          {
                              "label":"@monsterId",
                              "name": "@monsterId",
                              "type": "string"
                          }
                      ]
                  },
                  {
                      "label":"JobOccupations",
                      "name": "JobOccupations",
                      "type": "object",
                      "properties": [
                          {
                              "label":"JobOccupation",
                              "name": "JobOccupation",
                              "type": "object",
                              "properties": [
                                  {
                                      "label":"@monsterId",
                                      "name": "@monsterId",
                                      "type": "string"
                                  }
                              ]
                          }
                      ]
                  },
                  {
                      "label":"Location",
                      "name": "Location",
                      "type": "object",
                      "properties": [
                          {
                              "label":"City",
                              "name": "City",
                              "type": "string"
                          },
                          {
                              "label":"State",
                              "name": "State",
                              "type": "string"
                          },
                          {
                              "label":"CountryCode",
                              "name": "CountryCode",
                              "type": "string"
                          },
                          {
                              "label":"PostalCode",
                              "name": "PostalCode",
                              "type": "string"
                          }
                      ]
                  }
              ]
            }
      ]
    },
    {
      "label":"RecruiterReference",
      "name": "RecruiterReference",
      "type": "object",
      "properties": [
          {
              "label":"UserName",
              "name": "UserName",
              "type": "string"
          }
      ]
    }
]

function constructMapping(sourceField, destinationField, sourceFieldType='string', destinationFieldType='string', mappingType='field_to_field', expression=null) {
    var mapping = {
        "sourceField": sourceField,
        "destinationField": destinationField,
        "sourceFieldType": sourceFieldType,
        "destinationFieldType": destinationFieldType,
        "mappingType": mappingType,
    }
    if (mappingType === 'expression') {
        mapping['expression'] = {
            "script": expression
        } 
    }
    return mapping;
}

function experienceConversionScript() {
     return "{var source = scriptFunctions.getSourcePayload();" +
     "    var expMap = {" +
     "        'Internship':'16'," +
     "        'Entry Level':'11'," +
     "        'Associate':'12'," +
     "        'Mid-Senior Level':'13'," +
     "        'Director/ Vice-President':'14'," +
     "        'Executive/President':'15'" +
     "    }" +
     "    if(source.experience == null || !expMap.hasOwnProperty(source.experience)){" +
     "        return '11';" +
     "    }" +
     "    return expMap[source.experience]}";
}

function jobTypeConversionScript() {
    return  "{    var source = scriptFunctions.getSourcePayload();" +
            "    var jobTypeMap = {" +
            "        'Contract': '2'," +
            "        'Full Time ': '1'," +
            "        'Internship': '3'," +
            "        'Part-time': '2'," +
            "        'Temporary': '87'," +
            "        'Seasonal': '20'," +
            "        'Volunteer': '75'," +
            "        'Fixed-term': '2'," +
            "        'Secondment': '1'" +
            "    }" +
            "    if (source.type == null || !jobTypeMap.hasOwnProperty(source.type)){" +
            "        return '1';" +
            "    }" +
            "    return jobTypeMap[source.type];" +
            "}";
}

function jobStatusScript(){
    return "{" +
            "    var source = scriptFunctions.getSourcePayload();" +
            "    var jobStatusMap = {" +
            "        'Contract': '5'," +
            "        'Full Time': '4'," +
            "        'Internship': '5'," +
            "        'Part-time': '5'," +
            "        'Temporary': '5'," +
            "        'Seasonal': '5'," +
            "        'Volunteer': '5'," +
            "        'Fixed-term contract': '4'," +
            "        'Secondment': '4'" +
            "    }" +
            "    if (source.type == null || !jobStatusMap.hasOwnProperty(source.type)){" +
            "        return '4';" +
            "    }" +
            "    return jobStatusMap[source.type];" +
            "}";
}

function currencyScript() {
    return "{var source = scriptFunctions.getSourcePayload();" +
    "    var currencyMap = {" +
    "        'USD': '1'," +
    "        'EUR': '2'," +
    "        'ARS': '3'," +
    "        'AUD': '4'," +
    "        'BEF': '5'," +
    "        'BRL': '6'," +
    "        'CAD': '7'," +
    "        'CHF': '8'," +
    "        'CNY': '9'," +
    "        'CZK': '10'," +
    "        'DEM': '11'," +
    "        'ESP': '12'," +
    "        'FJD': '13'" +
    "    }" +
    "    if (source.salary == null || source.salary.currency == null){" +
    "        return null;" +
    "    }" +
    "    return  currencyMap[source.salary.currency];}";
}

function jobCategoryScript(category) {
    const categoryMap = {
        "Accounting/Finance/Insurance" :"1",
        "Administrative/Clerical" :"2",
        "Education/Training" :"3",
        "Engineering" :"4",
        "Human Resources" :"5",
        "Legal" :"7",
        "Sales/Retail/Business Development" :"10",
        "Other" :"11",
        "Food Services/Hospitality" :"13",
        "Manufacturing/Production/Operations" :"47",
        "Building Construction/Skilled Trades" :"544",
        "Customer Support/Client Care" :"545",
        "Installation/Maintenance/Repair" :"553",
        "Security/Protective Services" :"555",
        "Banking/Real Estate/Mortgage Professionals" :"558",
        "Biotech/R&D/Science" :"559",
        "IT/Software Development" :"660",
        "Business/Strategic Management" :"3561",
        "Medical/Health" :"3975",
        "Editorial/Writing" :"5623",
        "Logistics/Transportation" :"5625",
        "Marketing/Product" :"9007",
        "Project/Program Management" :"9008",
        "Creative/Design" :"11454",
        "Quality Assurance/Safety" :"11455",
        "Agriculture, Forestry, & Fishing" :"15581"
    }
    return categoryMap[category];
}

function getOccupation(occupation){
    const occupationMap = {
        "Accounts Payable/Receivable": "11711",
        "Actuarial Analysis": "11712",
        "Audit": "11724",
        "Bookkeeping": "11730",
        "Collections": "11750",
        "Corporate Finance": "11760",
        "Credit Review/Analysis": "11766",
        "Financial Analysis/Research/Reporting": "11803",
        "Financial Planning/Advising": "11804",
        "Fund Accounting": "11817",
        "Investment Management": "11843",
        "General/Other: Accounting/Finance": "11893",
        "Policy Underwriting": "11927",
        "Real Estate Appraisal": "11940",
        "Risk Management/Compliance": "11952",
        "Securities Analysis/Research": "11959",
        "Financial Products Sales/Brokerage": "11960",
        "Tax Accounting": "11981",
        "Tax Assessment and Collections": "11982",
        "Claims Review and Adjusting": "14866",
        "Corporate Accounting": "14867",
        "Financial Control": "14868",
        "Real Estate Leasing/Acquisition": "14875",
        "Administrative Support": "11713",
        "Data Entry/Order Processing": "11770",
        "Executive Support": "11797",
        "Filing/Records Management": "11802",
        "Office Management": "11888",
        "General/Other: Administrative/Clerical": "11894",
        "Reception/Switchboard": "11942",
        "Secretary/Executive Assistant": "11958",
        "Claims Processing": "14865",
        "Property Management": "14874",
        "Transcription": "14880",
        "Classroom Teaching": "11748",
        "Continuing/Adult": "11756",
        "Corporate Development and Training": "11759",
        "Customer Training": "11768",
        "Early Childhood Care & Development": "11779",
        "Elementary School": "11784",
        "Fitness & Sports Training/Instruction": "11807",
        "Junior/High School": "11851",
        "General/Other: Training/Instruction": "11915",
        "School/College Administration": "11955",
        "Software/Web Training": "11971",
        "Special Education": "11972",
        "University": "11995",
        "Aeronautic/Avionic Engineering": "11715",
        "Bio-Engineering": "11728",
        "CAD/Drafting": "11737",
        "Chemical Engineering": "11746",
        "Civil & Structural Engineering": "11747",
        "Electrical/Electronics Engineering": "11782",
        "Energy/Nuclear Engineering": "11786",
        "Environmental and Geological Engineering": "11788",
        "Industrial/Manufacturing Engineering": "11838",
        "Mechanical Engineering": "11867",
        "Naval Architecture/Marine Engineering": "11881",
        "General/Other: Engineering": "11900",
        "RF/Wireless Engineering": "11951",
        "Systems/Process Engineering": "11980",
        "Compensation/Benefits Policy": "11751",
        "Corporate Development and Training": "11759",
        "Diversity Management/EEO/Compliance": "11777",
        "HR Systems Administration": "11834",
        "General/Other: Human Resources": "11902",
        "Payroll and Benefits Administration": "11918",
        "Recruiting/Sourcing": "11943",
        "Academic Admissions and Advising": "14864",
        "Attorney": "11722",
        "Contracts Administration": "11757",
        "Labor & Employment Law": "11852",
        "General/Other: Legal": "11905",
        "Paralegal & Legal Secretary": "11916",
        "Patent/IP Law": "11917",
        "Real Estate Law": "11941",
        "Regulatory/Compliance Law": "11944",
        "Tax Law": "11983",
        "Account Management (Commissioned)": "11709",
        "Business Development/New Accounts": "11735",
        "Field Sales": "11801",
        "Fundraising": "11818",
        "Insurance Agent/Broker": "11839",
        "International Sales": "11840",
        "Media and Advertising Sales": "11868",
        "Merchandise Planning and Buying": "11874",
        "General/Other: Sales/Business Development": "11913",
        "Real Estate Agent/Broker": "11939",
        "Retail/Counter Sales and Cashier": "11950",
        "Sales Support/Assistance": "11954",
        "Financial Products Sales/Brokerage": "11960",
        "Store/Branch Management": "11975",
        "Technical Presales Support & Technical Sales": "11986",
        "Telesales": "11989",
        "Travel Agent/Ticket Sales": "11993",
        "Visual/Display Merchandising": "12002",
        "Wholesale/Reselling Sales": "12006",
        "Other": "11892",
        "Work at Home": "12008",
        "Food & Beverage Serving": "11810",
        "Food Preparation/Cooking": "11811",
        "Front Desk/Reception": "11816",
        "Guest Services/Concierge": "11822",
        "Guide (Tour)": "11823",
        "Host/Hostess": "11831",
        "General/Other: Food Services": "11901",
        "Restaurant Management": "11947",
        "Wine Steward (Sommelier)": "12007",
        "Assembly/Assembly Line": "11721",
        "Audio/Video Broadcast & Postproduction": "11723",
        "Equipment Operations": "11792",
        "Hazardous Materials Handling": "11827",
        "Layout, Prepress, Printing, & Binding Operations": "11855",
        "Machining/CNC": "11859",
        "Metal Fabrication and Welding": "11877",
        "Moldmaking/Casting": "11880",
        "Operations/Plant Management": "11890",
        "General/Other: Production/Operations": "11909",
        "Production/Operations Planning": "11933",
        "Sewing and Tailoring": "11962",
        "Telecommunications Administration/Management": "11987",
        "Waste Pick-up and Removal": "12003",
        "Laundry and Dry-Cleaning Operations": "14871",
        "Scientific/Technical Production": "14878",
        "CAD/Drafting": "11737",
        "Carpentry/Framing": "11743",
        "Concrete and Masonry": "11755",
        "Electrician": "11783",
        "Flooring/Tiling/Painting/Wallpapering": "11809",
        "Heavy Equipment Operation": "11829",
        "HVAC": "11835",
        "Ironwork/Metal Fabrication": "11845",
        "General/Other: Construction/Skilled Trades": "11896",
        "Plumbing/Pipefitting": "11925",
        "Roofing": "11953",
        "Sheetrock/Plastering": "11963",
        "Site Superintendent": "11965",
        "Surveying": "11978",
        "Account Management (Non-Commissioned)": "11710",
        "Bank Teller": "11726",
        "Call Center": "11738",
        "Customer Training": "11768",
        "Flight Attendant": "11808",
        "Hair Cutting/Styling": "11824",
        "General/Other: Customer Support/Client Care": "11898",
        "Reservations/Ticketing": "11945",
        "Retail Customer Service": "11948",
        "Technical Customer Service": "11985",
        "Computer/Electronics/Telecomm Install/Maintain/Repair": "11753",
        "Electrician": "11783",
        "Equipment Install/Maintain/Repair": "11791",
        "Facilities Management/Maintenance": "11798",
        "HVAC": "11835",
        "Janitorial & Cleaning": "11849",
        "Landscaping": "11854",
        "Locksmith": "11858",
        "Oil Rig & Pipeline Install/Maintain/Repair": "11889",
        "General/Other: Installation/Maintenance/Repair": "11903",
        "Plumbing/Pipefitting": "11925",
        "Vehicle Repair and Maintenance": "12000",
        "Wire and Cable Install/Maintain/Repair": "14881",
        "Airport Security and Screening": "11718",
        "Correctional Officer": "11762",
        "Customs/Immigration": "11769",
        "Firefighting and Rescue": "11805",
        "Military Combat": "11879",
        "General/Other: Security/Protective Services": "11914",
        "Police-Law Enforcement": "11926",
        "Security Guard": "11961",
        "Store Security/Loss Prevention": "11974",
        "Security Intelligence & Analysis": "14879",
        "Bank Teller": "11726",
        "Real Estate Agent/Broker": "11939",
        "Real Estate Appraisal": "11940",
        "Real Estate Law": "11941",
        "Store/Branch Management": "11975",
        "Credit Manager": "15226",
        "Loan Officer/Originator": "15228",
        "Mortgage Broker": "15229",
        "Title Officer/Closer": "15230",
        "Underwriter": "15231",
        "Escrow Officer/Manager": "15232",
        "Biological/Chemical Research": "11729",
        "Clinical Research": "11749",
        "Environmental/Geological Testing & Analysis": "11790",
        "Materials/Physical Research": "11865",
        "Mathematical/Statistical Research": "11866",
        "New Product R&D": "11883",
        "General/Other: R&D/Science": "11912",
        "Pharmaceutical Research": "11921",
        "Computer/Network Security": "11754",
        "Database Development/Administration": "11772",
        "Desktop Service and Support": "11774",
        "Enterprise Software Implementation & Consulting": "11787",
        "IT Project Management": "11848",
        "Network and Server Administration": "11882",
        "General/Other: IT/Software Development": "11904",
        "Software/System Architecture": "11969",
        "Software/Web Development": "11970",
        "Systems Analysis - IT": "11979",
        "Telecommunications Administration/Management": "11987",
        "Usability/Information Architecture": "11996",
        "Web/UI/UX Design": "12005",
        "Business Analysis/Research": "11734",
        "Business Unit Management": "11736",
        "Franchise-Business Ownership": "11814",
        "Hospital/Clinic Administration": "11830",
        "Managerial Consulting": "11860",
        "Mergers and Acquisitions": "11875",
        "General/Other: Business/Strategic Management": "11895",
        "President/Top Executive": "11929",
        "Public Health Administration": "11936",
        "Restaurant Management": "11947",
        "School/College Administration": "11955",
        "Store/Branch Management": "11975",
        "Strategic Planning/Intelligence": "11976",
        "Town/City Planning": "11990",
        "Hotel/Lodging Management": "14869",
        "Dental Practitioner": "11773",
        "EMT/Paramedic": "11785",
        "Healthcare Aid": "11820",
        "Laboratory/Pathology": "11853",
        "Medical Practitioner": "11870",
        "Medical Therapy/Rehab Services": "11871",
        "Dental Assistant/Hygienist": "11872",
        "Mental Health": "11873",
        "Nursing": "11885",
        "Nutrition and Diet": "11886",
        "Optical": "11891",
        "General/Other: Medical/Health": "11908",
        "Pharmacy": "11922",
        "Public Health Administration": "11936",
        "Medical Imaging": "11938",
        "Social Service": "11967",
        "Sports Medicine": "11973",
        "Veterinary/Animal Care": "12001",
        "Physician Assistant/Nurse Practitioner": "14873",
        "Digital Content Development": "11775",
        "Documentation/Technical Writing": "11778",
        "Editing & Proofreading": "11781",
        "Journalism": "11850",
        "General/Other: Editorial/Writing": "11899",
        "Translation/Interpretation": "11992",
        "Car, Van and Bus Driving": "11739",
        "Cargo and Baggage Handling": "11742",
        "Cost Estimating": "11763",
        "Equipment/Forklift/Crane Operation": "11793",
        "Hazardous Materials Handling": "11827",
        "Import/Export Administration": "11836",
        "Inventory Planning and Management": "11842",
        "Merchandise Planning and Buying": "11874",
        "Messenger/Courier": "11876",
        "General/Other: Logistics/Transportation": "11906",
        "Piloting: Air and Marine": "11924",
        "Purchasing": "11937",
        "Shipping and Receiving/Warehousing": "11964",
        "Supplier Management/Vendor Management": "11977",
        "Train or Rail Operator": "11991",
        "Truck Driving": "11994",
        "Vehicle Dispatch, Routing and Scheduling": "11998",
        "Brand/Product Marketing": "11732",
        "Copy Writing/Editing": "11758",
        "Direct Marketing (CRM)": "11776",
        "Events/Promotional Marketing": "11795",
        "Investor and Public/Media Relations": "11844",
        "Market Research": "11862",
        "Marketing Communications": "11863",
        "Marketing Production/Traffic": "11864",
        "Media Planning and Buying": "11869",
        "General/Other: Marketing/Product": "11907",
        "Product Management": "11931",
        "Telemarketing": "11988",
        "Visual/Display Merchandising": "12002",
        "Event Planning/Coordination": "11794",
        "IT Project Management": "11848",
        "General/Other: Project/Program Management": "11910",
        "Program Management": "11934",
        "Project Management": "11935",
        "Advertising Writing (Creative)": "11714",
        "Architecture/Interior Design": "11719",
        "Computer Animation & Multimedia": "11752",
        "Creative Direction/Lead": "11765",
        "Fashion & Accessories Design": "11800",
        "Graphic Arts/Illustration": "11821",
        "Industrial Design": "11837",
        "General/Other: Creative/Design": "11897",
        "Photography and Videography": "11923",
        "Web/UI/UX Design": "12005",
        "Building/Construction Inspection": "11733",
        "Environmental Protection/Conservation": "11789",
        "Food Safety and Inspection": "11813",
        "Fraud Investigation": "11815",
        "ISO Certification": "11846",
        "Occupational Health and Safety": "11887",
        "General/Other: Quality Assurance/Safety": "11911",
        "Production Quality Assurance": "11932",
        "Six Sigma/Black Belt/TQM": "11966",
        "Software Quality Assurance": "11968",
        "Vehicle Inspection": "11999",
        "Agriculture": "15582"  
    }

    return occupationMap[occupation];
}

function constructFTMonMapping() {
    var mappings = []
    
    mappings.push(constructMapping(null,'@xmlns', null, 'string', 'expression', "{return 'http://schemas.monster.com/Monster'}"));
    mappings.push(constructMapping(null,'@xmlns:xsi', null, 'string', 'expression', "{return 'http://www.w3.org/2001/XMLSchema-instance'}"));
    mappings.push(constructMapping(null,'@xsi:schemaLocation', null, 'string', 'expression', "{return 'http://schemas.monster.com/Monster http://schemas.monster.com/Current/xsd/Monster.xsd'}"));
    mappings.push(constructMapping(null,'@jobAction', null, 'string', 'expression', "{return 'addOrUpdate'}"));
    mappings.push(constructMapping('id','@jobRefCode', 'number', 'string'));
    mappings.push(constructMapping('username','RecruiterReference.UserName'));

    mappings.push(constructMapping('title','JobInformation.JobTitle'));
    //experience field mapping
    mappings.push(constructMapping(null,'JobInformation.JobLevel.@monsterId', null, 'string', 'expression', experienceConversionScript()));
    
    //job type conversion
    mappings.push(constructMapping(null,'JobInformation.JobType.@monsterId', null, 'string', 'expression', jobTypeConversionScript()));

    //job status
    mappings.push(constructMapping(null,'JobInformation.JobStatus.@monsterId', null, 'string', 'expression',jobStatusScript()));

    mappings.push(constructMapping('salary.min','JobInformation.Salary.SalaryMin', 'number', 'string'));
    mappings.push(constructMapping('salary.max','JobInformation.Salary.SalaryMax', 'number', 'string'));

    //currency script
    mappings.push(constructMapping(null,'JobInformation.Salary.Currency.@monsterId', null, 'string', 'expression', currencyScript()));

    mappings.push(constructMapping('description','JobInformation.JobBody'));

    mappings.push(constructMapping('duration','JobPostings.JobPosting.@desiredDuration', 'string', 'string'));
    mappings.push(constructMapping('branch.city','JobPostings.JobPosting.Location.City'));
    mappings.push(constructMapping('branch.state','JobPostings.JobPosting.Location.State'));
    mappings.push(constructMapping('branch.country_code','JobPostings.JobPosting.Location.CountryCode'));
    mappings.push(constructMapping('branch.zip','JobPostings.JobPosting.Location.PostalCode'));

    mappings.push(constructMapping('job_category','JobPostings.JobPosting.JobCategory.@monsterId'));
    mappings.push(constructMapping('job_occupation','JobPostings.JobPosting.JobOccupations.JobOccupation.@monsterId'));
    mappings.push(constructMapping(null,'JobPostings.JobPosting.BoardName.@monsterId', null, 'string', 'expression','{return "178"}'));
    return mappings;
}

exports = {
    properties: properties,
    constructFTMonMapping: constructFTMonMapping,
    getOccupation: getOccupation,
    getJobCategory: jobCategoryScript
}