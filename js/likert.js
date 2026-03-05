/**
 * Thesis Interpretation Assistant — Likert Analyzer
 * Vanilla JS: manual table title, opening phrase, scale mapping, indicator rows.
 * Computes weighted mean, rank (ties = average-of-positions), qualitative description, AWM.
 * Generates formal academic interpretation paragraph.
 * localStorage: likertTables[], tablesProcessed, interpretationsGenerated, reportsCreated, recentActivity.
 */

(function () {
  'use strict';

  var KEYS = {
    likertTables: 'likertTables',
    tablesProcessed: 'tablesProcessed',
    interpretationsGenerated: 'interpretationsGenerated',
    reportsCreated: 'reportsCreated',
    recentActivity: 'recentActivity',
    likertDataSaved: 'likertDataSaved'
  };
  var MAX_ACTIVITY = 8;

  var OPENINGS = [
    'In terms of ',
    'Regarding ',
    'Considering ',
    'Across ',
    'Focusing on ',
    'Relative to ',
    'Concerning ',
    'Pertaining to ',
    'With reference to ',
    'In relation to ',
    'As to '
  ];
  var openingIndex = 0;

  function getOpener() {
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    return Utils ? Utils.getVariedOpener() : OPENINGS[openingIndex % OPENINGS.length];
  }

  var DEFAULT_SCALE = [
    { min: 4.21, max: 5.00, label: '' },
    { min: 3.41, max: 4.20, label: '' },
    { min: 2.61, max: 3.40, label: '' },
    { min: 1.81, max: 2.60, label: '' },
    { min: 1.00, max: 1.80, label: '' }
  ];

  // Active project: rp1 (cooperative learning), rp2 (Science 3 SH vs Teachers)
  var activeProjectId = 'rp1';
  // Active table selection and loaded data (single source of truth)
  var activeTableId = '';
  var activeTableData = null;

  // Predefined Likert tables for Research Paper 1 (cooperative learning, single group)
  // Each table stores indicators with existing weighted mean (wm), Q.D. (qd), and rank.
  var LIKERT_TABLE_CONFIGS = {
    t10: {
      id: 't10',
      title: 'Table 10. Extent of Use of Cooperative Learning Strategies in Enhancing the Performance of Grade 5 Pupils in Mathematics',
      theme: 'the extent of use of Cooperative Learning Strategies in enhancing the performance of Grade 5 pupils in Mathematics',
      awm: 4.33,
      awmDesc: 'VERY OFTEN',
      rows: [
        { indicator: 'Organize pupils into small groups to solve mathematical problems.', wm: 4.60, qd: 'VO', rank: 2 },
        { indicator: 'Encourage pupils to work together to complete Mathematics tasks.', wm: 4.16, qd: 'O', rank: 10.5 },
        { indicator: 'Assign specific roles to pupils during group activities.', wm: 4.16, qd: 'O', rank: 10.5 },
        { indicator: 'Allow pupils to explain mathematical concepts to their peers.', wm: 4.04, qd: 'O', rank: 12 },
        { indicator: 'Integrate group games and interactive activities in Mathematics lessons.', wm: 4.44, qd: 'VO', rank: 6.5 },
        { indicator: 'Facilitate group discussions before pupils present their answers.', wm: 4.36, qd: 'VO', rank: 9 },
        { indicator: 'Design mathematical tasks that require teamwork and cooperation.', wm: 4.44, qd: 'VO', rank: 6.5 },
        { indicator: 'Implement peer tutoring and peer assessment activities in class.', wm: 4.48, qd: 'VO', rank: 5 },
        { indicator: 'Guide and monitor each group while performing Cooperative tasks.', wm: 4.64, qd: 'VO', rank: 1 },
        { indicator: 'Promote sharing of ideas and solution strategies among pupils.', wm: 4.40, qd: 'VO', rank: 8 },
        { indicator: 'Conduct group reflections after each Cooperative learning activity.', wm: 4.00, qd: 'O', rank: 13 },
        { indicator: 'Plan lessons that ensure equal participation of all group members.', wm: 3.80, qd: 'O', rank: 14.5 },
        { indicator: 'Evaluate both individual and group performance in Mathematics.', wm: 3.80, qd: 'O', rank: 14.5 },
        { indicator: 'Modify Cooperative activities based on pupils’ learning progress.', wm: 4.52, qd: 'VO', rank: 2 }
      ]
    },
    t11: {
      id: 't11',
      title: 'Table 11. Extent of Effect of Cooperative Learning Strategies in Enhancing the Performance of Grade 5 Pupils in Mathematics',
      theme: 'the extent of effect of Cooperative Learning Strategies in enhancing the performance of Grade 5 pupils in Mathematics',
      awm: 4.41,
      awmDesc: 'VERY EFFECTIVE',
      rows: [
        { indicator: 'Organize pupils into small groups to solve mathematical problems.', wm: 4.40, qd: 'VE', rank: 7.5 },
        { indicator: 'Encourage pupils to work together to complete Mathematics tasks.', wm: 4.52, qd: 'VE', rank: 4 },
        { indicator: 'Assign specific roles to pupils during group activities.', wm: 4.36, qd: 'VE', rank: 9 },
        { indicator: 'Allow pupils to explain mathematical concepts to their peers.', wm: 4.24, qd: 'VE', rank: 12 },
        { indicator: 'Integrate group games and interactive activities in Mathematics lessons.', wm: 4.00, qd: 'E', rank: 14 },
        { indicator: 'Facilitate group discussions before pupils present their answers.', wm: 4.52, qd: 'VE', rank: 4 },
        { indicator: 'Design mathematical tasks that require teamwork and cooperation.', wm: 4.40, qd: 'VE', rank: 7.5 },
        { indicator: 'Implement peer tutoring and peer assessment activities in class.', wm: 4.24, qd: 'VE', rank: 12 },
        { indicator: 'Guide and monitor each group while performing Cooperative tasks.', wm: 4.68, qd: 'VE', rank: 1.5 },
        { indicator: 'Promote sharing of ideas and solution strategies among pupils.', wm: 4.44, qd: 'VE', rank: 6 },
        { indicator: 'Conduct group reflections after each Cooperative learning activity.', wm: 4.24, qd: 'VE', rank: 12 },
        { indicator: 'Plan lessons that ensure equal participation of all group members.', wm: 4.68, qd: 'VE', rank: 1.5 },
        { indicator: 'Evaluate both individual and group performance in Mathematics.', wm: 4.60, qd: 'VE', rank: 3 },
        { indicator: 'Modify Cooperative activities based on pupils’ learning progress.', wm: 4.52, qd: 'VE', rank: 4 }
      ]
    },
    t12: {
      id: 't12',
      title: 'Table 12. Extent of Realization of Mathematics 5 Most Essential Learning Competencies through the Use of Cooperative Learning Strategies for the First Quarter',
      theme: 'the extent of realization of Mathematics 5 most essential learning competencies through the use of cooperative learning strategies for the First Quarter',
      awm: 4.64,
      awmDesc: 'FULLY REALIZED',
      rows: [
        { indicator: 'Uses divisibility rules for 2, 5, and 10 to find the common factors of numbers.', wm: 4.64, qd: 'FR', rank: 11 },
        { indicator: 'Uses divisibility rules for 3, 6, and 9 to find common factors.', wm: 4.64, qd: 'FR', rank: 11 },
        { indicator: 'Uses divisibility rules for 4, 8, 12, and 11 to find common factors.', wm: 4.68, qd: 'FR', rank: 8 },
        { indicator: 'Solves routine and non-routine problems involving factors, multiples, and divisibility rules for 2,3,4,5,6,8,9,10,11, and 12.', wm: 4.44, qd: 'FR', rank: 17 },
        { indicator: 'Performs a series of more than two operations on whole numbers applying Parenthesis, Multiplication, Division, Addition, Subtraction (PMDAS) or Grouping, Multiplication, Division, Addition, Subtraction (GMDAS) correctly.', wm: 4.48, qd: 'FR', rank: 16 },
        { indicator: 'Finds the common factors, GCF, common multiples and LCM of 2-4 numbers using continuous division.', wm: 4.76, qd: 'FR', rank: 2.5 },
        { indicator: 'Solves real-life problems involving GCF and LCM of 2-3 given numbers.', wm: 4.68, qd: 'FR', rank: 8 },
        { indicator: 'Adds and subtracts fractions and mixed fractions without and with regrouping.', wm: 4.76, qd: 'FR', rank: 2.5 },
        { indicator: 'Solves routine and non-routine problems involving addition and/or subtraction of fractions using appropriate problem-solving strategies and tools.', wm: 4.64, qd: 'FR', rank: 11 },
        { indicator: 'Visualizes multiplication of fractions using models.', wm: 4.76, qd: 'FR', rank: 2.5 },
        { indicator: 'Multiplies a fraction and a whole number and another fraction.', wm: 4.76, qd: 'FR', rank: 2.5 },
        { indicator: 'Multiplies mentally proper fractions with denominators up to 10.', wm: 4.68, qd: 'FR', rank: 8 },
        { indicator: 'Solves routine or non-routine problems involving multiplication without or with addition or subtraction of fractions and whole numbers using appropriate problem solving strategies and tools.', wm: 4.56, qd: 'FR', rank: 13 },
        { indicator: 'Shows that multiplying a fraction by its reciprocal is equal to 1.', wm: 4.76, qd: 'FR', rank: 2.5 },
        { indicator: 'Visualizes division of fractions.', wm: 4.72, qd: 'FR', rank: 6 },
        { indicator: 'Divides simple fractions and whole numbers by a fraction and vice versa', wm: 4.52, qd: 'FR', rank: 14.5 },
        { indicator: 'Solves routine or non-routine problems involving division without or with any of the other operations of fractions and whole numbers using appropriate problem-solving strategies and tools.', wm: 4.52, qd: 'FR', rank: 14.5 }
      ]
    },
    t13: {
      id: 't13',
      title: 'Table 13. Extent of Realization of Mathematics 5 Most Essential Learning Competencies through the Use of Cooperative Learning Strategies for the Second Quarter',
      theme: 'the extent of realization of Mathematics 5 most essential learning competencies through the use of cooperative learning strategies for the Second Quarter',
      awm: 4.61,
      awmDesc: 'FULLY REALIZED',
      rows: [
        { indicator: 'Gives the place value and the value of a digit of a given decimal number through ten thousandths.', wm: 4.76, qd: 'FR', rank: 1.5 },
        { indicator: 'Reads and writes decimal numbers through ten thousandths.', wm: 4.68, qd: 'FR', rank: 6 },
        { indicator: 'Rounds decimal numbers to the nearest hundredth and thousandth.', wm: 4.68, qd: 'FR', rank: 6 },
        { indicator: 'Compares and arranges decimal numbers.', wm: 4.68, qd: 'FR', rank: 6 },
        { indicator: 'Adds and subtracts decimal numbers through thousandths without and with regrouping.', wm: 4.76, qd: 'FR', rank: 1.5 },
        { indicator: 'Solves routine or non-routine problems involving addition and subtraction of decimal numbers, including money, using appropriate problem-solving strategies and tools.', wm: 4.56, qd: 'FR', rank: 15.5 },
        { indicator: 'Multiplies decimals up to 2 decimal places by 1- to 2-digit whole numbers.', wm: 4.68, qd: 'FR', rank: 6 },
        { indicator: 'Multiplies decimals with factors up to 2 decimal places.', wm: 4.60, qd: 'FR', rank: 13.5 },
        { indicator: 'Estimates the products of decimal numbers with reasonable results.', wm: 4.48, qd: 'FR', rank: 18 },
        { indicator: 'Solves routine and non-routine problems involving multiplication without or with addition or subtraction of decimals and whole numbers, including money, using appropriate problem-solving strategies and tools.', wm: 4.44, qd: 'FR', rank: 19 },
        { indicator: 'Divides decimals with up to 2 decimal places.', wm: 4.64, qd: 'FR', rank: 11 },
        { indicator: 'Divides whole numbers with quotients in decimal form.', wm: 4.68, qd: 'FR', rank: 6 },
        { indicator: 'Solves routine and non-routine problems involving division without or with any of the other operations of decimals and whole numbers, including money, using appropriate problem-solving strategies and tools.', wm: 4.52, qd: 'FR', rank: 17 },
        { indicator: 'Visualizes the ratio of 2 given numbers.', wm: 4.64, qd: 'FR', rank: 11 },
        { indicator: 'Identifies and writes equivalent ratios.', wm: 4.68, qd: 'FR', rank: 6 },
        { indicator: 'Expresses ratios in their simplest forms.', wm: 4.68, qd: 'FR', rank: 6 },
        { indicator: 'Finds the missing term in a pair of equivalent ratios.', wm: 4.60, qd: 'FR', rank: 13.5 },
        { indicator: 'Defines and describes a proportion.', wm: 4.56, qd: 'FR', rank: 15.5 },
        { indicator: 'Recognizes when two quantities are in direct proportion.', wm: 4.64, qd: 'FR', rank: 11 }
      ]
    },
    t14: {
      id: 't14',
      title: 'Table 14. Extent of Realization of Mathematics 5 Most Essential Learning Competencies through the Use of Cooperative Learning Strategies for the Third Quarter',
      theme: 'the extent of realization of Mathematics 5 most essential learning competencies through the use of cooperative learning strategies for the Third Quarter',
      awm: 4.46,
      awmDesc: 'FULLY REALIZED',
      rows: [
        { indicator: 'Visualizes percent and its relationship to fractions, ratios, and decimal numbers using models.', wm: 4.44, qd: 'FR', rank: 12.5 },
        { indicator: 'Defines percentage, rate or percent, and base.', wm: 4.48, qd: 'FR', rank: 9.5 },
        { indicator: 'Identifies the base, percentage, and rate in a problem.', wm: 4.48, qd: 'FR', rank: 9.5 },
        { indicator: 'Finds the percentage in a given problem.', wm: 4.64, qd: 'FR', rank: 1 },
        { indicator: 'Solves routine and non-routine problems involving percentage using appropriate strategies and tools.', wm: 4.44, qd: 'FR', rank: 12.5 },
        { indicator: 'Visualizes, names, describes and draws polygons with 5 or more sides.', wm: 4.60, qd: 'FR', rank: 2.5 },
        { indicator: 'Describes and compares properties of polygons (regular and irregular polygons). Visualizes congruent polygons.', wm: 4.60, qd: 'FR', rank: 2.5 },
        { indicator: 'Identifies the terms related to a circle. Draws circles with different radii using a Compass.', wm: 4.56, qd: 'FR', rank: 4.5 },
        { indicator: 'Visualizes and describes solid figures.', wm: 4.56, qd: 'FR', rank: 4.5 },
        { indicator: 'Makes models of different solid figures: cube, prism, pyramid, cylinder, cone, and sphere using plane figures.', wm: 4.48, qd: 'FR', rank: 9.5 },
        { indicator: 'Formulates the rule in finding the next term in a sequence.', wm: 4.32, qd: 'FR', rank: 16.5 },
        { indicator: 'Different strategies (looking for a pattern, working backwards, etc.) To solve for the unknown in simple equations involving one or more operations on whole numbers and fractions.', wm: 4.40, qd: 'FR', rank: 14.5 },
        { indicator: 'Measures time using a 12-hour and a 24-hour clock.', wm: 4.32, qd: 'FR', rank: 16.5 },
        { indicator: 'Calculates time in the different world time zones in relation to the Philippines.', wm: 4.16, qd: 'R', rank: 18 },
        { indicator: 'Solves problems involving time.', wm: 4.40, qd: 'FR', rank: 14.5 },
        { indicator: 'Measures circumference of a circle using appropriate tools.', wm: 4.40, qd: 'FR', rank: 14.5 },
        { indicator: 'Finds the circumference of a circle.', wm: 4.36, qd: 'FR', rank: 15 },
        { indicator: 'Solves routine and non-routine problems involving circumference of a circle.', wm: 4.44, qd: 'FR', rank: 12.5 }
      ]
    },
    t15: {
      id: 't15',
      title: 'Table 15. Extent of Realization of Mathematics 5 Most Essential Learning Competencies through the Use of Cooperative Learning Strategies for the Fourth Quarter',
      theme: 'the extent of realization of Mathematics 5 most essential learning competencies through the use of cooperative learning strategies for the Fourth Quarter',
      awm: 4.38,
      awmDesc: 'FULLY REALIZED',
      rows: [
        { indicator: 'Finds the area of a given circle.', wm: 4.40, qd: 'FR', rank: 8 },
        { indicator: 'Solves routine and non-routine problems involving the area of a circle.', wm: 4.32, qd: 'FR', rank: 14.5 },
        { indicator: 'Visualizes the volume of a cube and rectangular prism.', wm: 4.40, qd: 'FR', rank: 8 },
        { indicator: 'Names the appropriate unit of measure used for measuring the volume of a cube and a rectangle prism.', wm: 4.48, qd: 'FR', rank: 3 },
        { indicator: 'Converts cu. Cm to cu. M and vice versa; cu.cm to l and vice versa.', wm: 4.36, qd: 'FR', rank: 10.5 },
        { indicator: 'Finds the volume of a given cube and rectangular prism using cu. cm and cu.m.', wm: 4.36, qd: 'FR', rank: 10.5 },
        { indicator: 'Estimates and uses appropriate units of measure for volume.', wm: 4.36, qd: 'FR', rank: 10.5 },
        { indicator: 'Solves routine and non-routine problems involving volume of a cube and rectangular prism in real-life situations using appropriate strategies and tools.', wm: 4.20, qd: 'R', rank: 17.5 },
        { indicator: 'Reads and measures temperature using thermometer (alcohol and/or digital) in degree celsius.', wm: 4.44, qd: 'FR', rank: 5.5 },
        { indicator: 'Solves routine and non-routine problems involving temperature in real-life situations.', wm: 4.36, qd: 'FR', rank: 10.5 },
        { indicator: 'Organizes data in tabular form and presents them in a line graph.', wm: 4.44, qd: 'FR', rank: 5.5 },
        { indicator: 'Interprets data presented in different kinds of line graphs (single to double-line graph).', wm: 4.32, qd: 'FR', rank: 14.5 },
        { indicator: 'Solves routine and non-routine problems using data presented in a line graph.', wm: 4.56, qd: 'FR', rank: 1.5 },
        { indicator: 'Draws inferences based on data presented in abline graph.', wm: 4.36, qd: 'FR', rank: 10.5 },
        { indicator: 'Describes experimental probability.', wm: 4.20, qd: 'R', rank: 17.5 },
        { indicator: 'Performs an experimental probability and records result by listing.', wm: 4.40, qd: 'FR', rank: 8 },
        { indicator: 'Analyzes data obtained from chance using experiments involving letter cards (a to z) and number cards (0 to 20).', wm: 4.32, qd: 'FR', rank: 14.5 },
        { indicator: 'Solves routine and non-routine problems involving experimental probability.', wm: 4.56, qd: 'FR', rank: 1.5 }
      ]
    },
    t16: {
      id: 't16',
      title: 'Table 16. Executive Summary of the Extent of Realization of Mathematics 5 Most Essential Learning Competencies',
      theme: 'the executive summary of the extent of realization of Mathematics 5 most essential learning competencies',
      awm: 4.52,
      awmDesc: 'FULLY REALIZED',
      rows: [
        { indicator: 'First Quarter', wm: 4.64, qd: 'FR', rank: 1 },
        { indicator: 'Second Quarter', wm: 4.61, qd: 'FR', rank: 2 },
        { indicator: 'Third Quarter', wm: 4.46, qd: 'FR', rank: 3 },
        { indicator: 'Fourth Quarter', wm: 4.38, qd: 'FR', rank: 4 }
      ]
    },
    t17: {
      id: 't17',
      title: 'Table 17. Extent of the Challenges Encountered by Mathematics 5 Teachers in Using Cooperative Learning Strategies in terms of Teacher-Related Factors',
      theme: 'the challenges encountered in using cooperative learning strategies in terms of teacher-related factors',
      awm: 3.46,
      awmDesc: 'SERIOUS',
      rows: [
        { indicator: 'Experience difficulty in designing Cooperative activities suitable for pupils with varying abilities.', wm: 3.64, qd: 'S', rank: 1 },
        { indicator: 'Lack confidence in facilitating group discussions during Mathematics lessons.', wm: 3.28, qd: 'MS', rank: 5 },
        { indicator: 'Find it challenging to maintain control and focus during group work activities.', wm: 3.52, qd: 'S', rank: 2.5 },
        { indicator: 'Encounter difficulty in assessing both individual and group learning outcomes.', wm: 3.36, qd: 'MS', rank: 4 },
        { indicator: 'Struggle to adapt teaching methods to effectively apply Cooperative learning strategies.', wm: 3.52, qd: 'S', rank: 2.5 }
      ]
    },
    t18: {
      id: 't18',
      title: 'Table 18. Extent of the Challenges Encountered by Mathematics 5 Teachers in Using Cooperative Learning Strategies in terms of Time Management',
      theme: 'the challenges encountered in using cooperative learning strategies in terms of time management',
      awm: 3.79,
      awmDesc: 'SERIOUS',
      rows: [
        { indicator: 'Spend considerable time preparing materials and instructions for group activities.', wm: 3.88, qd: 'S', rank: 1 },
        { indicator: 'Have insufficient time to conduct and complete Cooperative learning tasks within a period.', wm: 3.68, qd: 'S', rank: 5 },
        { indicator: 'Find it difficult to monitor all pupil groups due to limited class time.', wm: 3.76, qd: 'S', rank: 4 },
        { indicator: 'Struggle to balance coverage of lessons with the time needed for group work.', wm: 3.80, qd: 'S', rank: 3 },
        { indicator: 'Spend extra time checking and evaluating pupils’ group outputs.', wm: 3.84, qd: 'S', rank: 2 }
      ]
    },
    t19: {
      id: 't19',
      title: 'Table 19. Extent of the Challenges Encountered by Mathematics 5 Teachers in Using Cooperative Learning Strategies in terms of Pupils’ Factors',
      theme: 'the challenges encountered in using cooperative learning strategies in terms of pupils’ factors',
      awm: 3.56,
      awmDesc: 'SERIOUS',
      rows: [
        { indicator: 'Encounter pupils who are reluctant to participate in group activities.', wm: 3.76, qd: 'S', rank: 1 },
        { indicator: 'Face challenges with pupils who dominate or contribute very little during group work.', wm: 3.52, qd: 'S', rank: 4 },
        { indicator: 'Deal with pupils who lack the communication and cooperation skills needed for collaboration.', wm: 3.56, qd: 'S', rank: 2.5 },
        { indicator: 'Observe pupils who lose focus or engage in off-task behavior during group activities.', wm: 3.56, qd: 'S', rank: 2.5 },
        { indicator: 'Struggle with grouping pupils of different ability levels to ensure balanced participation.', wm: 3.40, qd: 'MS', rank: 5 }
      ]
    },
    t20: {
      id: 't20',
      title: 'Table 20. Extent of the Challenges Encountered by Mathematics 5 Teachers in Using Cooperative Learning Strategies in terms of Resource-Related Factors',
      theme: 'the challenges encountered in using cooperative learning strategies in terms of resource-related factors',
      awm: 3.45,
      awmDesc: 'SERIOUS',
      rows: [
        { indicator: 'Lack sufficient instructional materials for effective group activities.', wm: 3.60, qd: 'S', rank: 2 },
        { indicator: 'Have limited classroom space to organize Cooperative learning sessions.', wm: 3.68, qd: 'S', rank: 1 },
        { indicator: 'Experience difficulty in accessing visual aids or technological tools for group work.', wm: 3.20, qd: 'MS', rank: 5 },
        { indicator: 'Receive inadequate support from the school in implementing Cooperative learning.', wm: 3.44, qd: 'S', rank: 3 },
        { indicator: 'Face a shortage of printed and manipulative materials needed for Mathematics activities.', wm: 3.32, qd: 'MS', rank: 4 }
      ]
    },
    t21: {
      id: 't21',
      title: 'Table 21. Executive Summary of the Extent of the Challenges Encountered by Mathematics 5 Teachers in Using Cooperative Learning Strategies',
      theme: 'the executive summary of the extent of the challenges encountered by Mathematics 5 teachers in using Cooperative Learning Strategies',
      awm: 3.57,
      awmDesc: 'SERIOUS',
      rows: [
        { indicator: 'Teacher-related factors', wm: 3.46, qd: 'S', rank: 3 },
        { indicator: 'Time management', wm: 3.79, qd: 'S', rank: 1 },
        { indicator: 'Pupils’ factors', wm: 3.56, qd: 'S', rank: 2 },
        { indicator: 'Resource-related factors', wm: 3.45, qd: 'S', rank: 4 }
      ]
    },
    t22: {
      id: 't22',
      title: 'Table 22. Extent of Effectiveness of the Coping Mechanisms to Address the Challenges Encountered in Using Cooperative Learning in Mathematics 5 Instruction',
      theme: 'the effectiveness of the coping mechanisms to address the challenges encountered in using Cooperative Learning in Mathematics 5 Instruction',
      awm: 4.35,
      awmDesc: 'VERY EFFECTIVE',
      rows: [
        { indicator: 'Attend training and seminars to improve knowledge of cooperative learning strategies.', wm: 4.48, qd: 'VE', rank: 1.5 },
        { indicator: 'Seek guidance or mentoring from experienced colleagues in applying group activities.', wm: 4.44, qd: 'VE', rank: 3.5 },
        { indicator: 'Reflect on teaching practices to identify ways to improve group facilitation skills.', wm: 4.36, qd: 'VE', rank: 7 },
        { indicator: 'Use clear instructions and structured tasks to maintain order during group work.', wm: 4.44, qd: 'VE', rank: 3.5 },
        { indicator: 'Apply classroom management techniques to keep pupils engaged and focused.', wm: 4.48, qd: 'VE', rank: 1.5 },
        { indicator: 'Plan lessons ahead to allocate sufficient time for Cooperative activities.', wm: 4.16, qd: 'E', rank: 15 },
        { indicator: 'Set clear time limits for each group task to ensure activities are completed on schedule.', wm: 4.40, qd: 'VE', rank: 6 },
        { indicator: 'Integrate short, focused group activities instead of lengthy ones.', wm: 4.36, qd: 'VE', rank: 7 },
        { indicator: 'Use a timer or visual cues to help pupils manage time during group tasks.', wm: 4.32, qd: 'VE', rank: 10.5 },
        { indicator: 'Combine Cooperative learning with other teaching strategies to optimize class time.', wm: 4.28, qd: 'VE', rank: 12 },
        { indicator: 'Provide orientation and guidance on how to work effectively in groups.', wm: 4.36, qd: 'VE', rank: 7 },
        { indicator: 'Assign mixed-ability groups to encourage peer learning and balanced participation.', wm: 4.20, qd: 'E', rank: 13 },
        { indicator: 'Rotate group leaders to give each pupil a chance to lead and contribute.', wm: 4.36, qd: 'VE', rank: 7 },
        { indicator: 'Use motivational strategies to encourage participation and teamwork.', wm: 4.36, qd: 'VE', rank: 7 },
        { indicator: 'Offer individual feedback to pupils who struggle to cooperate in group settings.', wm: 4.32, qd: 'VE', rank: 10.5 }
      ]
    }
  };

  var computedData = {
    indicators: [],
    awm: 0,
    awmDesc: '',
    tableTitle: '',
    theme: '',
    scaleMapping: []
  };

  var currentLikertConfig = null;
  var usingPredefinedTable = false;
  var useLoadedQd = true;
  var laInterpretationSh = '';
  var laInterpretationT = '';
  var laInterpTwoGroup = false;
  var currentTwoGroupData = null;

  // ---------- Research Paper 2 (Science 3, School Heads vs Teachers) ----------
  // Two-group weighted tables and T-test tables (Tables 10–22)
  var RP2_TABLE_CONFIGS = {
    // Table 10 — Curiosity (two-group weighted example)
    t10: {
      id: 't10',
      type: 'twoGroupWeighted',
      title: 'Table 10. Level of Abilities of Grade 3 Pupils in Science in Terms of Curiosity',
      themeHeads: 'the level of abilities of Grade 3 pupils in Science in terms of curiosity as perceived by school heads',
      themeTeachers: 'the level of abilities of Grade 3 pupils in Science in terms of curiosity as perceived by teachers',
      awm: {
        sh: { value: 4.13, qd: 'HIGH' },
        t: { value: 4.13, qd: 'HIGH' }
      },
      rows: [
        {
          indicator: 'Ask questions about phenomena observed in class',
          sh: { wm: 4.10, qd: 'H', rank: 7.5 },
          t: { wm: 4.03, qd: 'H', rank: 8 }
        },
        {
          indicator: 'Show interest in discovering how things work',
          sh: { wm: 4.18, qd: 'H', rank: 4 },
          t: { wm: 4.28, qd: 'VH', rank: 2 }
        },
        {
          indicator: 'Seek additional information about scientific topics',
          sh: { wm: 4.13, qd: 'H', rank: 6 },
          t: { wm: 4.10, qd: 'H', rank: 7 }
        },
        {
          indicator: 'Explore new science concepts beyond the lesson',
          sh: { wm: 4.20, qd: 'H', rank: 1.5 },
          t: { wm: 4.15, qd: 'H', rank: 4.5 }
        },
        {
          indicator: 'Express excitement when performing experiments',
          sh: { wm: 4.18, qd: 'H', rank: 4 },
          t: { wm: 4.13, qd: 'H', rank: 6 }
        },
        {
          indicator: 'Pay attention during science demonstrations',
          sh: { wm: 4.20, qd: 'H', rank: 1.5 },
          t: { wm: 4.33, qd: 'VH', rank: 1 }
        },
        {
          indicator: 'Connect classroom concepts to real-life situations',
          sh: { wm: 4.18, qd: 'H', rank: 4 },
          t: { wm: 4.18, qd: 'H', rank: 3 }
        },
        {
          indicator: 'Test own ideas in science activities',
          sh: { wm: 4.10, qd: 'H', rank: 7.5 },
          t: { wm: 4.15, qd: 'H', rank: 4.5 }
        },
        {
          indicator: 'Notice patterns and relationships in observed phenomena',
          sh: { wm: 4.03, qd: 'H', rank: 9 },
          t: { wm: 3.98, qd: 'H', rank: 9 }
        },
        {
          indicator: 'Initiate small science investigations independently',
          sh: { wm: 3.98, qd: 'H', rank: 10 },
          t: { wm: 3.95, qd: 'H', rank: 10 }
        }
      ],
      prewritten: {
        sh: 'Relative to the level of abilities of Grade 3 pupils in Science in terms of curiosity, school head respondents claim that the following indicators are high: “Explore new science concepts beyond the lesson.” and “Pay attention during science demonstrations.” each with a weighted mean of 4.20; “Show interest in discovering how things work.” “Express excitement when performing experiments.” and “Connect classroom concepts to real-life situations.” each with a weighted mean of 4.18; “Seek additional information about scientific topics.” with a weighted mean of 4.13; “Ask questions about phenomena observed in class.” and “Test own ideas in science activities.” each with a weighted mean of 4.10; “Notice patterns and relationships in observed phenomena.” with a weighted mean of 4.03; and “Initiate small science investigations independently.” with a weighted mean of 3.98. The average weighted mean of 4.13, interpreted as High, indicates that the pupils demonstrate a consistently high level of curiosity as assessed by the school heads.',
        t: 'Meanwhile, teacher respondents report very high levels of curiosity for the indicators “Pay attention during science demonstrations.” with a weighted mean of 4.33 and “Show interest in discovering how things work.” with a weighted mean of 4.28. They further assess as high the following indicators: “Connect classroom concepts to real-life situations.” with a weighted mean of 4.18; “Explore new science concepts beyond the lesson.” and “Test own ideas in science activities.” each with a weighted mean of 4.15; “Express excitement when performing experiments.” with a weighted mean of 4.13; “Seek additional information about scientific topics.” with a weighted mean of 4.10; “Ask questions about phenomena observed in class.” with a weighted mean of 4.03; “Notice patterns and relationships in observed phenomena.” with a weighted mean of 3.98; and “Initiate small science investigations independently.” with a weighted mean of 3.95. The average weighted mean of 4.13, interpreted as High, denotes that teachers likewise perceive the pupils to possess a high level of curiosity in Science 3.'
      }
    },
    t11: {
      id: 't11',
      type: 'twoGroupWeighted',
      title: 'Table 11. Level of Abilities of Grade 3 Pupils in Science in Terms of Creativity',
      awm: { sh: { value: 4.11, qd: 'HIGH' }, t: { value: 4.06, qd: 'HIGH' } },
      rows: [
        { indicator: 'Propose original ideas when solving science problems', sh: { wm: 4.20, qd: 'H', rank: 2 }, t: { wm: 4.15, qd: 'H', rank: 3 } },
        { indicator: 'Design unique solutions during science activities', sh: { wm: 4.13, qd: 'H', rank: 4 }, t: { wm: 3.75, qd: 'H', rank: 10 } },
        { indicator: 'Present science projects imaginatively', sh: { wm: 4.23, qd: 'H', rank: 1 }, t: { wm: 4.25, qd: 'VH', rank: 1 } },
        { indicator: 'Combine prior knowledge with new concepts creatively', sh: { wm: 4.10, qd: 'H', rank: 6 }, t: { wm: 4.05, qd: 'H', rank: 7 } },
        { indicator: 'Suggest alternative methods for experiments', sh: { wm: 3.95, qd: 'H', rank: 10 }, t: { wm: 3.85, qd: 'H', rank: 9 } },
        { indicator: 'Use materials inventively during hands-on activities', sh: { wm: 4.15, qd: 'H', rank: 3 }, t: { wm: 4.03, qd: 'H', rank: 8 } },
        { indicator: 'Develop innovative explanations for observed phenomena', sh: { wm: 4.10, qd: 'H', rank: 6 }, t: { wm: 4.08, qd: 'H', rank: 6 } },
        { indicator: 'Create drawings, models, or diagrams to explain concepts', sh: { wm: 4.08, qd: 'H', rank: 8 }, t: { wm: 4.10, qd: 'H', rank: 4.5 } },
        { indicator: 'Adapt ideas when first attempts do not work', sh: { wm: 4.10, qd: 'H', rank: 6 }, t: { wm: 4.20, qd: 'H', rank: 2 } },
        { indicator: 'Generate multiple solutions to science challenges', sh: { wm: 4.05, qd: 'H', rank: 9 }, t: { wm: 4.10, qd: 'H', rank: 4.5 } }
      ],
      prewritten: {
        sh: 'As to the level of abilities of Grade 3 pupils in Science in terms of creativity, school head respondents assess as high the indicators: "Present science projects imaginatively." with a weighted mean of 4.23; "Propose original ideas when solving science problems." with a weighted mean of 4.20; "Use materials inventively during hands-on activities." with a weighted mean of 4.15; "Design unique solutions during science activities." with a weighted mean of 4.13; "Combine prior knowledge with new concepts creatively." "Develop innovative explanations for observed phenomena." and "Adapt ideas when first attempts do not work." each with a weighted mean of 4.10; "Create drawings, models, or diagrams to explain concepts." with a weighted mean of 4.08; "Generate multiple solutions to science challenges." with a weighted mean of 4.05; and "Suggest alternative methods for experiments." with a weighted mean of 3.95. The average weighted mean of 4.11, interpreted as High, indicates that school heads perceive the pupils to consistently demonstrate strong creative abilities in Science 3.',
        t: 'Meanwhile, teacher respondents assess as very high the indicator "Present science projects imaginatively." with a weighted mean of 4.25. They further rate as high the indicators: "Adapt ideas when first attempts do not work." with a weighted mean of 4.20; "Propose original ideas when solving science problems." with a weighted mean of 4.15; "Generate multiple solutions to science challenges." and "Create drawings, models, or diagrams to explain concepts." each with a weighted mean of 4.10; "Develop innovative explanations for observed phenomena." with a weighted mean of 4.08; "Combine prior knowledge with new concepts creatively." with a weighted mean of 4.05; "Use materials inventively during hands-on activities." with a weighted mean of 4.03; "Suggest alternative methods for experiments." with a weighted mean of 3.85; and "Design unique solutions during science activities." with a weighted mean of 3.75. The average weighted mean of 4.06, interpreted as High, denotes that teachers likewise perceive the pupils to exhibit a generally high level of creativity in their Science 3 performance.'
      }
    },
    t12: {
      id: 't12',
      type: 'twoGroupWeighted',
      title: 'Table 12. Level of Abilities of Grade 3 Pupils in Science in Terms of Communication',
      awm: { sh: { value: 4.29, qd: 'VERY HIGH' }, t: { value: 3.99, qd: 'HIGH' } },
      rows: [
        { indicator: 'Express observations and findings clearly', sh: { wm: 4.28, qd: 'VH', rank: 6 }, t: { wm: 3.98, qd: 'H', rank: 6 } },
        { indicator: 'Explain science concepts in own words', sh: { wm: 4.33, qd: 'VH', rank: 4 }, t: { wm: 4.10, qd: 'H', rank: 3.5 } },
        { indicator: 'Participate actively in group discussions', sh: { wm: 4.23, qd: 'VH', rank: 7.5 }, t: { wm: 3.95, qd: 'H', rank: 7 } },
        { indicator: 'Use appropriate scientific vocabulary when speaking', sh: { wm: 4.15, qd: 'H', rank: 9 }, t: { wm: 3.85, qd: 'H', rank: 8.5 } },
        { indicator: 'Present science projects confidently to classmates', sh: { wm: 4.40, qd: 'VH', rank: 3 }, t: { wm: 4.13, qd: 'H', rank: 2 } },
        { indicator: 'Ask clarifying questions to understand others\' explanations', sh: { wm: 4.43, qd: 'VH', rank: 2 }, t: { wm: 4.10, qd: 'H', rank: 3.5 } },
        { indicator: 'Listen attentively and respond appropriately', sh: { wm: 4.30, qd: 'VH', rank: 5 }, t: { wm: 4.00, qd: 'H', rank: 5 } },
        { indicator: 'Use drawings or diagrams to communicate ideas', sh: { wm: 4.48, qd: 'VH', rank: 1 }, t: { wm: 4.18, qd: 'H', rank: 1 } },
        { indicator: 'Summarize experimental results effectively', sh: { wm: 4.13, qd: 'H', rank: 10 }, t: { wm: 3.78, qd: 'H', rank: 10 } },
        { indicator: 'Provide constructive feedback to peers during activities', sh: { wm: 4.23, qd: 'VH', rank: 7.5 }, t: { wm: 3.85, qd: 'H', rank: 8.5 } }
      ],
      prewritten: {
        sh: 'About the level of abilities of Grade 3 pupils in Science in terms of communication, school head respondents report very high ratings for the indicators: "Use drawings or diagrams to communicate ideas." with a weighted mean of 4.48; "Ask clarifying questions to understand others\' explanations." and "Present science projects confidently to classmates." each with a weighted mean of 4.43 and 4.40; "Explain science concepts in own words." with a weighted mean of 4.33; "Listen attentively and respond appropriately." with a weighted mean of 4.30; "Express observations and findings clearly." with a weighted mean of 4.28; and "Participate actively in group discussions." and "Provide constructive feedback to peers during activities." each with a weighted mean of 4.23. They further assess as high the indicators "Use appropriate scientific vocabulary when speaking." with a weighted mean of 4.15 and "Summarize experimental results effectively." with a weighted mean of 4.13. The average weighted mean of 4.29, interpreted as Very High (VH), indicates that school heads perceive the pupils to possess very strong communication abilities in Science 3.',
        t: 'Meanwhile, teacher respondents assess as high all communication indicators, led by: "Use drawings or diagrams to communicate ideas." with a weighted mean of 4.18; "Present science projects confidently to classmates." with a weighted mean of 4.13; "Explain science concepts in own words." and "Ask clarifying questions to understand others\' explanations." each with a weighted mean of 4.10; "Participate actively in group discussions." with a weighted mean of 3.95; "Express observations and findings clearly." with a weighted mean of 3.98; "Listen attentively and respond appropriately." with a weighted mean of 4.00; "Provide constructive feedback to peers during activities." and "Use appropriate scientific vocabulary when speaking." each with weighted means of 3.85; and "Summarize experimental results effectively." with a weighted mean of 3.78. The average weighted mean of 3.99, interpreted as High, denotes that teachers perceive the pupils to demonstrate generally strong communication abilities in Science 3.'
      }
    },
    t13: {
      id: 't13',
      type: 'twoGroupWeighted',
      title: 'Table 13. Level of Abilities of Grade 3 Pupils in Science in Terms of Collaboration',
      awm: { sh: { value: 4.45, qd: 'VERY HIGH' }, t: { value: 4.25, qd: 'VERY HIGH' } },
      rows: [
        { indicator: 'Cooperate with peers during group experiments', sh: { wm: 4.33, qd: 'VH', rank: 10 }, t: { wm: 4.15, qd: 'H', rank: 8 } },
        { indicator: 'Share responsibilities equally in team tasks', sh: { wm: 4.45, qd: 'VH', rank: 6.5 }, t: { wm: 4.23, qd: 'VH', rank: 5.5 } },
        { indicator: 'Respect opinions of other group members', sh: { wm: 4.40, qd: 'VH', rank: 8.5 }, t: { wm: 4.20, qd: 'H', rank: 7 } },
        { indicator: 'Help peers who are struggling with tasks', sh: { wm: 4.53, qd: 'VH', rank: 1.5 }, t: { wm: 4.30, qd: 'VH', rank: 3 } },
        { indicator: 'Contribute ideas during group discussions', sh: { wm: 4.48, qd: 'VH', rank: 4.5 }, t: { wm: 4.28, qd: 'VH', rank: 4 } },
        { indicator: 'Work together to solve science problems', sh: { wm: 4.50, qd: 'VH', rank: 3 }, t: { wm: 4.33, qd: 'VH', rank: 2.5 } },
        { indicator: 'Negotiate and reach agreements when conflicts arise', sh: { wm: 4.40, qd: 'VH', rank: 8.5 }, t: { wm: 4.10, qd: 'H', rank: 9 } },
        { indicator: 'Encourage participation from all group members', sh: { wm: 4.48, qd: 'VH', rank: 4.5 }, t: { wm: 4.35, qd: 'VH', rank: 1 } },
        { indicator: 'Divide tasks efficiently during science projects', sh: { wm: 4.53, qd: 'VH', rank: 1.5 }, t: { wm: 4.33, qd: 'VH', rank: 2.5 } },
        { indicator: 'Acknowledge contributions of teammates', sh: { wm: 4.45, qd: 'VH', rank: 6.5 }, t: { wm: 4.23, qd: 'VH', rank: 5.5 } }
      ],
      prewritten: {
        sh: 'Regarding the level of abilities of Grade 3 pupils in Science in terms of collaboration, school head respondents assess as very high the following indicators: "Help peers who are struggling with tasks." and "Divide tasks efficiently during science projects." each with a weighted mean of 4.53; "Work together to solve science problems." with a weighted mean of 4.50; "Contribute ideas during group discussions." and "Encourage participation from all group members." each with a weighted mean of 4.48; "Share responsibilities equally in team tasks." and "Acknowledge contributions of teammates." each with a weighted mean of 4.45; "Respect opinions of other group members." and "Negotiate and reach agreements when conflicts arise." each with a weighted mean of 4.40; and "Cooperate with peers during group experiments." with a weighted mean of 4.33. The average weighted mean of 4.45 (Very High) indicates that school heads perceive the pupils to demonstrate very strong collaborative abilities in Science 3.',
        t: 'Meanwhile, teacher respondents assess the following indicators as very high: "Encourage participation from all group members." with a weighted mean of 4.35, "Work together to solve science problems." and "Divide tasks efficiently during science projects." each with 4.33, "Help peers who are struggling with tasks." with 4.30, "Contribute ideas during group discussions." with 4.28, and "Share responsibilities equally in team tasks." and "Acknowledge contributions of teammates." each with 4.23. They further assess the following as high including "Respect opinions of other group members." with 4.20, "Cooperate with peers during group experiments." with 4.15, and "Negotiate and reach agreements when conflicts arise." with 4.10. The average weighted mean of 4.25, described as very high, indicates that teachers consistently perceive pupils\' collaborative abilities in Science 3 as highly developed across all indicators.'
      }
    },
    t14: {
      id: 't14',
      type: 'twoGroupWeighted',
      title: 'Table 14. Executive Summary of the Level of Abilities of Grade 3 Pupils in Science',
      awm: { sh: { value: 4.25, qd: 'VERY HIGH' }, t: { value: 4.11, qd: 'HIGH' } },
      rows: [
        { indicator: 'Curiosity', sh: { wm: 4.13, qd: 'H', rank: 3 }, t: { wm: 4.13, qd: 'H', rank: 2 } },
        { indicator: 'Creativity', sh: { wm: 4.11, qd: 'H', rank: 4 }, t: { wm: 4.06, qd: 'H', rank: 3 } },
        { indicator: 'Communication', sh: { wm: 4.29, qd: 'VH', rank: 2 }, t: { wm: 3.99, qd: 'H', rank: 4 } },
        { indicator: 'Collaboration', sh: { wm: 4.45, qd: 'VH', rank: 1 }, t: { wm: 4.25, qd: 'VH', rank: 1 } }
      ],
      prewritten: {
        sh: 'The Executive Summary of the Level of Abilities of Grade 3 Pupils in Science shows that school heads rated very high the following domains: Collaboration with a weighted mean of 4.45 and Communication with a weighted mean of 4.29. The other domains are rated high, including Curiosity with a weighted mean of 4.13 and Creativity with a weighted mean of 4.11. With an overall average weighted mean of 4.25, the school heads indicate that the abilities of Grade 3 pupils in Science are very high.',
        t: 'Meanwhile, teacher respondents rated very high the domain of Collaboration, which obtained a weighted mean of 4.25. The remaining domains are rated high, including Curiosity with a weighted mean of 4.13, Creativity with a weighted mean of 4.06, and Communication with a weighted mean of 3.99. With an overall average weighted mean of 4.11, the teachers indicate that pupils\' abilities in Science are high.'
      }
    },
    t15: {
      id: 't15',
      type: 'twoGroupWeighted',
      title: 'Table 15. Extent of Constraints of Grade 3 Pupils in Science in Terms of Comprehension of Concepts',
      awm: { sh: { value: 2.70, qd: 'MODERATELY SERIOUS' }, t: { value: 2.24, qd: 'SLIGHTLY SERIOUS' } },
      rows: [
        { indicator: 'Struggle to understand abstract science concepts', sh: { wm: 3.08, qd: 'MS', rank: 1 }, t: { wm: 2.65, qd: 'MS', rank: 1 } },
        { indicator: 'Confuse scientific terms frequently', sh: { wm: 2.73, qd: 'MS', rank: 3.5 }, t: { wm: 2.40, qd: 'SS', rank: 2 } },
        { indicator: 'Have difficulty explaining cause-and-effect relationships', sh: { wm: 2.55, qd: 'SS', rank: 9 }, t: { wm: 2.10, qd: 'SS', rank: 8 } },
        { indicator: 'Find it challenging to interpret graphs or tables', sh: { wm: 2.63, qd: 'MS', rank: 7.5 }, t: { wm: 2.20, qd: 'SS', rank: 6 } },
        { indicator: 'Require repeated explanations to grasp concepts', sh: { wm: 2.80, qd: 'MS', rank: 2 }, t: { wm: 2.35, qd: 'SS', rank: 3 } },
        { indicator: 'Have difficulty connecting prior knowledge to new topics', sh: { wm: 2.63, qd: 'MS', rank: 7.5 }, t: { wm: 2.15, qd: 'SS', rank: 7 } },
        { indicator: 'Fail to identify key information from science texts', sh: { wm: 2.45, qd: 'SS', rank: 10 }, t: { wm: 2.00, qd: 'SS', rank: 10 } },
        { indicator: 'Struggle to summarize scientific information', sh: { wm: 2.70, qd: 'MS', rank: 5 }, t: { wm: 2.28, qd: 'SS', rank: 4 } },
        { indicator: 'Have difficulty solving problems based on scientific knowledge', sh: { wm: 2.68, qd: 'MS', rank: 6 }, t: { wm: 2.25, qd: 'SS', rank: 5 } },
        { indicator: 'Find it hard to apply concepts to real-life situations', sh: { wm: 2.73, qd: 'MS', rank: 3.5 }, t: { wm: 2.05, qd: 'SS', rank: 9 } }
      ],
      prewritten: {
        sh: 'In relation to the extent of constraints of Grade 3 pupils in Science in terms of comprehension of concepts, school head respondents claimed that the following constraints are moderately serious: "Struggle to understand abstract science concepts." with a weighted mean of 3.08; "Require repeated explanations to grasp concepts." with 2.80; "Confuse scientific terms frequently." and "Find it hard to apply concepts to real-life situations." each with 2.73; "Struggle to summarize scientific information." with 2.70; "Have difficulty solving problems based on scientific knowledge." with 2.68; and "Find it challenging to interpret graphs or tables." and "Have difficulty connecting prior knowledge to new topics." each with 2.63. They further assessed as slightly serious the constraints "Have difficulty explaining cause-and-effect relationships." with a weighted mean of 2.55 and "Fail to identify key information from science texts." with 2.45. The average weighted mean of 2.70, indicates that school heads perceive pupils\' comprehension-related constraints in Science 3 as moderately serious overall.',
        t: 'Meanwhile, teacher respondents rated as moderately serious only the constraint "Struggle to understand abstract science concepts." with a weighted mean of 2.65. They further assessed the remaining constraints as slightly serious, including "Confuse scientific terms frequently." with 2.40; "Require repeated explanations to grasp concepts." with 2.35; "Struggle to summarize scientific information." with 2.28; "Have difficulty solving problems based on scientific knowledge." with 2.25; "Find it challenging to interpret graphs or tables." with 2.20; "Have difficulty connecting prior knowledge to new topics." with 2.15; "Have difficulty explaining cause-and-effect relationships." with 2.10; "Find it hard to apply concepts to real-life situations." with 2.05; and "Fail to identify key information from science texts." with 2.00. The average weighted mean of 2.24 denotes that teachers perceive comprehension-related constraints in Science 3 as present but only slightly serious.'
      }
    },
    t16: {
      id: 't16',
      type: 'twoGroupWeighted',
      title: 'Table 16. Extent of Constraints of Grade 3 Pupils in Science in Terms of Readiness for Inquiry-Based Tasks',
      awm: { sh: { value: 3.15, qd: 'MODERATELY SERIOUS' }, t: { value: 2.61, qd: 'MODERATELY SERIOUS' } },
      rows: [
        { indicator: 'Hesitate to participate in experiments', sh: { wm: 3.03, qd: 'MS', rank: 7 }, t: { wm: 2.48, qd: 'SS', rank: 7 } },
        { indicator: 'Require constant guidance during inquiry activities', sh: { wm: 3.10, qd: 'MS', rank: 6 }, t: { wm: 2.55, qd: 'SS', rank: 6 } },
        { indicator: 'Reluctantly formulate own questions', sh: { wm: 3.00, qd: 'MS', rank: 8.5 }, t: { wm: 2.45, qd: 'SS', rank: 8.5 } },
        { indicator: 'Show discomfort making predictions before experiments', sh: { wm: 3.38, qd: 'MS', rank: 1.5 }, t: { wm: 2.93, qd: 'MS', rank: 1 } },
        { indicator: 'Struggle to design simple investigations', sh: { wm: 3.28, qd: 'MS', rank: 3 }, t: { wm: 2.78, qd: 'MS', rank: 3 } },
        { indicator: 'Find it difficult to record and organize data', sh: { wm: 3.00, qd: 'MS', rank: 8.5 }, t: { wm: 2.40, qd: 'SS', rank: 10 } },
        { indicator: 'Have trouble analyzing results', sh: { wm: 3.18, qd: 'MS', rank: 4.5 }, t: { wm: 2.60, qd: 'SS', rank: 5 } },
        { indicator: 'Find it challenging to draw conclusions from observations', sh: { wm: 3.38, qd: 'MS', rank: 1.5 }, t: { wm: 2.83, qd: 'MS', rank: 2 } },
        { indicator: 'Need frequent prompts to reflect on learning', sh: { wm: 3.18, qd: 'MS', rank: 4.5 }, t: { wm: 2.68, qd: 'MS', rank: 4 } },
        { indicator: 'Reluctantly share findings in group activities', sh: { wm: 2.95, qd: 'MS', rank: 10 }, t: { wm: 2.45, qd: 'SS', rank: 8.5 } }
      ],
      prewritten: {
        sh: 'With respect to the extent of constraints of Grade 3 pupils in Science in terms of readiness for inquiry-based tasks, school head respondents assessed as moderately serious the indicators "Show discomfort making predictions before experiments." and "Find it challenging to draw conclusions from observations." each with a weighted mean of 3.38; "Struggle to design simple investigations." with a weighted mean of 3.28; "Have trouble analyzing results." and "Need frequent prompts to reflect on learning." each with a weighted mean of 3.18; "Require constant guidance during inquiry activities." with a weighted mean of 3.10; "Hesitate to participate in experiments." with a weighted mean of 3.03; "Reluctantly formulate own questions." and "Find it difficult to record and organize data." each with a weighted mean of 3.00; and "Reluctantly share findings in group activities." with a weighted mean of 2.95. The average weighted mean of 3.15 indicates that school heads view readiness-related constraints as moderately serious.',
        t: 'Meanwhile, teacher respondents rated as moderately serious the constraints "Show discomfort making predictions before experiments." with a weighted mean of 2.93; "Find it challenging to draw conclusions from observations." with a weighted mean of 2.83; "Struggle to design simple investigations." with a weighted mean of 2.78; and "Need frequent prompts to reflect on learning." with a weighted mean of 2.68. The remaining indicators are assessed as slightly serious, including "Have trouble analyzing results." with a weighted mean of 2.60; "Require constant guidance during inquiry activities." with a weighted mean of 2.55; "Hesitate to participate in experiments." with a weighted mean of 2.48; "Reluctantly formulate own questions." and "Reluctantly share findings in group activities." each with a weighted mean of 2.45; and "Find it difficult to record and organize data." with a weighted mean of 2.40. The average weighted mean of 2.61 indicates that teachers view readiness-related constraints as moderately serious.'
      }
    },
    t17: {
      id: 't17',
      type: 'twoGroupWeighted',
      title: 'Table 17. Extent of Constraints of Grade 3 Pupils in Science in Terms of Availability of Resources',
      awm: { sh: { value: 3.13, qd: 'MODERATELY SERIOUS' }, t: { value: 2.67, qd: 'MODERATELY SERIOUS' } },
      rows: [
        { indicator: 'Lack access to necessary science materials', sh: { wm: 3.00, qd: 'MS', rank: 8 }, t: { wm: 2.45, qd: 'SS', rank: 9.5 } },
        { indicator: 'Face difficulty conducting experiments due to insufficient equipment', sh: { wm: 3.13, qd: 'MS', rank: 5 }, t: { wm: 2.70, qd: 'MS', rank: 4.5 } },
        { indicator: 'Cannot use technology effectively for science tasks', sh: { wm: 3.08, qd: 'MS', rank: 6.5 }, t: { wm: 2.48, qd: 'SS', rank: 7.5 } },
        { indicator: 'Have limited access to reference books or educational materials', sh: { wm: 3.18, qd: 'MS', rank: 3 }, t: { wm: 2.70, qd: 'MS', rank: 4.5 } },
        { indicator: 'Cannot perform hands-on activities due to resource shortages', sh: { wm: 3.35, qd: 'MS', rank: 1.5 }, t: { wm: 3.05, qd: 'MS', rank: 1 } },
        { indicator: 'Struggle to complete projects because of inadequate materials', sh: { wm: 3.08, qd: 'MS', rank: 6.5 }, t: { wm: 2.65, qd: 'MS', rank: 6 } },
        { indicator: 'Experience limited laboratory space', sh: { wm: 3.15, qd: 'MS', rank: 4 }, t: { wm: 2.80, qd: 'MS', rank: 3 } },
        { indicator: 'Cannot practice experiments at home due to lack of materials', sh: { wm: 3.35, qd: 'MS', rank: 1.5 }, t: { wm: 2.98, qd: 'MS', rank: 2 } },
        { indicator: 'Depend heavily on teacher-provided resources', sh: { wm: 2.98, qd: 'MS', rank: 9.5 }, t: { wm: 2.48, qd: 'SS', rank: 7.5 } },
        { indicator: 'Experience delays in learning due to scarcity of instructional tools', sh: { wm: 2.98, qd: 'MS', rank: 9.5 }, t: { wm: 2.45, qd: 'SS', rank: 9.5 } }
      ],
      prewritten: {
        sh: 'Concerning the extent of constraints of Grade 3 pupils in Science in terms of availability of resources, school head respondents assessed as moderately serious the indicators "Cannot perform hands-on activities due to resource shortages." and "Cannot practice experiments at home due to lack of materials." each with a weighted mean of 3.35; "Have limited access to reference books or educational materials." with a weighted mean of 3.18; "Experience limited laboratory space." with a weighted mean of 3.15; "Face difficulty conducting experiments due to insufficient equipment." with a weighted mean of 3.13; "Cannot use technology effectively for science tasks." and "Struggle to complete projects because of inadequate materials." each with a weighted mean of 3.08; "Lack access to necessary science materials." with a weighted mean of 3.00; and "Depend heavily on teacher-provided resources." and "Experience delays in learning due to scarcity of instructional tools." each with a weighted mean of 2.98. The average weighted mean of 3.13 indicates that school heads view resource-related constraints as moderately serious.',
        t: 'Meanwhile, teacher respondents assessed as moderately serious the constraints "Cannot perform hands-on activities due to resource shortages." with a weighted mean of 3.05; "Cannot practice experiments at home due to lack of materials." with a weighted mean of 2.98; "Experience limited laboratory space." with a weighted mean of 2.80; "Face difficulty conducting experiments due to insufficient equipment." and "Have limited access to reference books or educational materials." each with a weighted mean of 2.70; and "Struggle to complete projects because of inadequate materials." with a weighted mean of 2.65. The remaining indicators are assessed as slightly serious, including "Cannot use technology effectively for science tasks." and "Depend heavily on teacher-provided resources." each with a weighted mean of 2.48, and "Lack access to necessary science materials." and "Experience delays in learning due to scarcity of instructional tools." each with a weighted mean of 2.45. The average weighted mean of 2.67 indicates that teachers view resource-related constraints as moderately serious.'
      }
    },
    t18: {
      id: 't18',
      type: 'twoGroupWeighted',
      title: 'Table 18. Extent of Constraints of Grade 3 Pupils in Science in Terms of Support from the Learning Environment',
      awm: { sh: { value: 2.99, qd: 'MODERATELY SERIOUS' }, t: { value: 2.42, qd: 'SLIGHTLY SERIOUS' } },
      rows: [
        { indicator: 'Experience distractions in the classroom that affect learning', sh: { wm: 3.18, qd: 'MS', rank: 1 }, t: { wm: 2.75, qd: 'MS', rank: 1 } },
        { indicator: 'Receive minimal encouragement from peers during science activities', sh: { wm: 3.10, qd: 'MS', rank: 2 }, t: { wm: 2.60, qd: 'SS', rank: 3 } },
        { indicator: 'Receive limited guidance from teachers outside class hours', sh: { wm: 3.08, qd: 'MS', rank: 3.5 }, t: { wm: 2.58, qd: 'SS', rank: 4 } },
        { indicator: 'Receive minimal support from family for science learning', sh: { wm: 3.08, qd: 'MS', rank: 3.5 }, t: { wm: 2.48, qd: 'SS', rank: 5 } },
        { indicator: 'Lack access to a conducive study area', sh: { wm: 3.00, qd: 'MS', rank: 5 }, t: { wm: 2.35, qd: 'SS', rank: 7 } },
        { indicator: 'Feel unsafe handling science materials in the classroom', sh: { wm: 2.95, qd: 'MS', rank: 6 }, t: { wm: 2.30, qd: 'SS', rank: 8 } },
        { indicator: 'Lack motivation from classroom displays or learning aids', sh: { wm: 2.93, qd: 'MS', rank: 7.5 }, t: { wm: 2.43, qd: 'SS', rank: 6 } },
        { indicator: 'Have limited opportunities for collaborative learning', sh: { wm: 2.93, qd: 'MS', rank: 7.5 }, t: { wm: 2.25, qd: 'SS', rank: 9 } },
        { indicator: 'Experience interruptions due to classroom management issues', sh: { wm: 2.90, qd: 'MS', rank: 9 }, t: { wm: 2.38, qd: 'SS', rank: 6.5 } },
        { indicator: 'Perceive that the school environment does not fully support science exploration', sh: { wm: 2.78, qd: 'MS', rank: 10 }, t: { wm: 2.10, qd: 'SS', rank: 10 } }
      ],
      prewritten: {
        sh: 'Pertaining to the extent of constraints of Grade 3 pupils in Science in terms of support from the learning environment, school head respondents assessed as moderately serious the indicator "Experience distractions in the classroom that affect learning." with a weighted mean of 3.18; "Receive minimal encouragement from peers during science activities." with a weighted mean of 3.10; "Receive limited guidance from teachers outside class hours." and "Have limited opportunities for collaborative learning." each with a weighted mean of 3.08; "Lack access to a conducive study area." with a weighted mean of 3.00; "Perceive that the school environment does not fully support science exploration." with a weighted mean of 2.95; "Feel unsafe handling science materials in the classroom." and "Experience interruptions due to classroom management issues." each with a weighted mean of 2.93; "Receive minimal support from family for science learning." with a weighted mean of 2.90; and "Lack motivation from classroom displays or learning aids." with a weighted mean of 2.78. The average weighted mean of 2.99 indicates that school heads view learning-environment constraints as moderately serious.',
        t: 'Meanwhile, teacher respondents assessed as moderately serious the indicator "Experience distractions in the classroom that affect learning." with a weighted mean of 2.75. All remaining indicators are assessed as slightly serious, including "Receive minimal encouragement from peers during science activities." with a weighted mean of 2.60; "Receive limited guidance from teachers outside class hours." with a weighted mean of 2.58; "Have limited opportunities for collaborative learning." with a weighted mean of 2.48; "Lack motivation from classroom displays or learning aids." with a weighted mean of 2.43; "Experience interruptions due to classroom management issues." with a weighted mean of 2.38; "Receive minimal support from family for science learning." with a weighted mean of 2.35; "Feel unsafe handling science materials in the classroom." with a weighted mean of 2.30; and "Lack access to a conducive study area." with a weighted mean of 2.10. The average weighted mean of 2.42 indicates that teachers view learning-environment constraints as slightly serious.'
      }
    },
    t19: {
      id: 't19',
      type: 'twoGroupWeighted',
      title: 'Table 19. Executive Summary of the Extent of Constraints of Grade 3 Pupils in Science',
      awm: { sh: { value: 2.99, qd: 'MODERATELY SERIOUS' }, t: { value: 2.48, qd: 'SLIGHTLY SERIOUS' } },
      rows: [
        { indicator: 'Comprehension of Concepts', sh: { wm: 2.70, qd: 'MS', rank: 2 }, t: { wm: 2.24, qd: 'SS', rank: 4 } },
        { indicator: 'Readiness for Inquiry-Based Tasks', sh: { wm: 3.15, qd: 'MS', rank: 1 }, t: { wm: 2.61, qd: 'MS', rank: 1 } },
        { indicator: 'Availability of Resources', sh: { wm: 3.13, qd: 'MS', rank: 3 }, t: { wm: 2.67, qd: 'MS', rank: 2 } },
        { indicator: 'Support from the Learning Environment', sh: { wm: 2.99, qd: 'MS', rank: 4 }, t: { wm: 2.42, qd: 'SS', rank: 3 } }
      ],
      prewritten: {
        sh: 'The Executive Summary of the Extent of Constraints of Grade 3 Pupils in Science shows that school heads rated the constraints as moderately serious across all domains. These include "Readiness for Inquiry-Based Tasks" with a weighted mean of 3.15, "Comprehension of Concepts" with 2.70, "Availability of Resources" with 3.13, and "Support from the Learning Environment" with 2.99. The average weighted mean of 2.99 indicates that school heads view the constraints experienced by Grade 3 pupils in Science as moderately serious.',
        t: 'Meanwhile, teacher respondents assessed the constraints in "Readiness for Inquiry-Based Tasks" with a weighted mean of 2.61 and "Availability of Resources" with 2.67, both described as moderately serious. They further assessed "Support from the Learning Environment" with 2.42 and "Comprehension of Concepts" with 2.24, both described as slightly serious. The average weighted mean of 2.49 implies that teachers perceive the constraints of Grade 3 pupils in Science as slightly serious.'
      }
    },
    t20: {
      id: 't20',
      type: 'twoGroupWeighted',
      title: 'Table 20. Extent of the Challenges Encountered by Teachers in Science 3 Instruction',
      awm: { sh: { value: 4.01, qd: 'SERIOUS' }, t: { value: 3.72, qd: 'SERIOUS' } },
      rows: [
        { indicator: 'Address diverse learner abilities effectively', sh: { wm: 4.03, qd: 'S', rank: 6.5 }, t: { wm: 3.68, qd: 'S', rank: 11 } },
        { indicator: 'Explain complex concepts in simple terms', sh: { wm: 4.03, qd: 'S', rank: 6.5 }, t: { wm: 3.75, qd: 'S', rank: 5 } },
        { indicator: 'Manage insufficient teaching resources for inquiry-based activities', sh: { wm: 3.98, qd: 'S', rank: 12.5 }, t: { wm: 3.55, qd: 'S', rank: 14 } },
        { indicator: 'Complete the science curriculum within limited time', sh: { wm: 3.88, qd: 'S', rank: 14.5 }, t: { wm: 3.58, qd: 'S', rank: 13 } },
        { indicator: 'Motivate unengaged or distracted learners', sh: { wm: 4.13, qd: 'S', rank: 1 }, t: { wm: 3.93, qd: 'S', rank: 1 } },
        { indicator: 'Implement hands-on or experimental tasks effectively', sh: { wm: 4.10, qd: 'S', rank: 2.5 }, t: { wm: 3.90, qd: 'S', rank: 2.5 } },
        { indicator: 'Manage group activities efficiently', sh: { wm: 4.00, qd: 'S', rank: 10 }, t: { wm: 3.68, qd: 'S', rank: 11 } },
        { indicator: 'Attend professional development to improve inquiry-based instruction', sh: { wm: 3.98, qd: 'S', rank: 12.5 }, t: { wm: 3.68, qd: 'S', rank: 11 } },
        { indicator: 'Provide individualized support for learners', sh: { wm: 4.03, qd: 'S', rank: 6.5 }, t: { wm: 3.75, qd: 'S', rank: 5 } },
        { indicator: 'Align lessons with students\' real-life experiences', sh: { wm: 4.03, qd: 'S', rank: 6.5 }, t: { wm: 3.70, qd: 'S', rank: 8 } },
        { indicator: 'Adapt lesson plans to accommodate learners\' constraints', sh: { wm: 3.88, qd: 'S', rank: 14.5 }, t: { wm: 3.50, qd: 'S', rank: 15 } },
        { indicator: 'Monitor and assess learner progress accurately', sh: { wm: 4.00, qd: 'S', rank: 10 }, t: { wm: 3.70, qd: 'S', rank: 8 } },
        { indicator: 'Encourage learners to actively participate in inquiry-based tasks', sh: { wm: 4.00, qd: 'S', rank: 10 }, t: { wm: 3.70, qd: 'S', rank: 8 } },
        { indicator: 'Communicate effectively with school heads and parents regarding learners\' needs', sh: { wm: 4.05, qd: 'S', rank: 4 }, t: { wm: 3.75, qd: 'S', rank: 5 } },
        { indicator: 'Integrate technology and other instructional tools in science teaching', sh: { wm: 4.10, qd: 'S', rank: 2.5 }, t: { wm: 3.90, qd: 'S', rank: 2.5 } }
      ],
      prewritten: {
        sh: 'The table shows the extent of the challenges encountered by teachers in Science 3 instruction, as assessed by school heads, all of which are described as serious. These include "Motivate unengaged or distracted learners." with a weighted mean of 4.13; "Implement hands-on or experimental tasks effectively." and "Integrate technology and other instructional tools in science teaching." each with a weighted mean of 4.10; and "Communicate effectively with school heads and parents regarding learners\' needs." with a weighted mean of 4.05. Also assessed as serious are "Address diverse learner abilities effectively," "Explain complex concepts in simple terms," "Provide individualized support for learners," and "Align lessons with students\' real-life experiences," each with a weighted mean of 4.03; "Manage group activities efficiently," "Monitor and assess learner progress accurately," and "Encourage learners to actively participate in inquiry-based tasks," each with a weighted mean of 4.00; "Manage insufficient teaching resources for inquiry-based activities." and "Attend professional development to improve inquiry-based instruction." each with a weighted mean of 3.98; and "Complete the science curriculum within limited time." and "Adapt lesson plans to accommodate learners\' constraints." each with a weighted mean of 3.88. The average weighted mean of 4.01 indicates that school heads view these instructional challenges in Science 3 as serious.',
        t: 'Meanwhile, teacher respondents likewise assess all the challenges as serious. These include "Motivate unengaged or distracted learners." with a weighted mean of 3.93; "Implement hands-on or experimental tasks effectively." and "Integrate technology and other instructional tools in science teaching." each with a weighted mean of 3.90; "Explain complex concepts in simple terms," "Provide individualized support for learners," and "Communicate effectively with school heads and parents regarding learners\' needs," each with a weighted mean of 3.75; and "Align lessons with students\' real-life experiences," "Monitor and assess learner progress accurately," and "Encourage learners to actively participate in inquiry-based tasks," each with a weighted mean of 3.70. They also assess as serious "Address diverse learner abilities effectively," "Manage group activities efficiently," and "Attend professional development to improve inquiry-based instruction," each with a weighted mean of 3.68; "Complete the science curriculum within limited time." with 3.58; "Manage insufficient teaching resources for inquiry-based activities." with 3.55; and "Adapt lesson plans to accommodate learners\' constraints." with 3.50, which ranks last. The average weighted mean of 3.72 indicates that teachers experience these challenges in Science 3 instruction to a serious extent.'
      }
    },
    t21: {
      id: 't21',
      type: 'tTest',
      title: 'Table 21. T-test for the Perceptions of School Heads and Teachers Regarding the Constraints of Learners in Science 3',
      rows: [
        { label: 'School Heads', tValue: '-4.340', tCritical: '1.991', pValue: '0000', decision: 'Reject H0', description: 'Significant' },
        { label: 'Teachers', tValue: '', tCritical: '', pValue: '', decision: '', description: '' }
      ],
      prewritten: {
        sh: 'The T-test results show a significant difference between the perceptions of school heads and teachers regarding the constraints of learners in Science 3. For the school heads, the computed t-value exceeded the t-critical value and the null hypothesis was rejected, indicating that their perception of learner constraints differs significantly from that of the teachers. This implies that school heads tend to view the constraints of Grade 3 pupils as more substantial, suggesting that supervisory perspectives may heighten sensitivity to learners\' difficulties across classrooms.',
        t: ''
      }
    },
    t22: {
      id: 't22',
      type: 'tTest',
      title: 'Table 22. T-test for the Perceptions of School Heads and Teachers Regarding the Challenges Encountered by Teachers in Science 3 Instruction',
      rows: [
        { label: 'School Heads', tValue: '-5.883', tCritical: '1.991', pValue: '0000', decision: 'Reject H0', description: 'Significant' },
        { label: 'Teachers', tValue: '', tCritical: '', pValue: '', decision: '', description: '' }
      ],
      prewritten: {
        sh: 'The T-test results reveal a significant difference between the perceptions of school heads and teachers regarding the challenges encountered in Science 3 instruction. For the school heads, the computed t-value exceeded the t-critical value and the null hypothesis was rejected, indicating that their perception of instructional challenges is significantly different from that of the teachers. This implies that school heads recognize a greater extent of challenges in Science 3 instruction, reflecting a wider administrative view of instructional demands, resource limitations, and curriculum expectations.',
        t: ''
      }
    }
  };

  function getNumber(key) {
    try {
      var val = localStorage.getItem(key);
      return val !== null ? parseInt(val, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function setNumber(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {}
  }

  function getLikertTables() {
    try {
      var raw = localStorage.getItem(KEYS.likertTables);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function appendActivity(text) {
    try {
      var raw = localStorage.getItem(KEYS.recentActivity);
      var arr = raw ? JSON.parse(raw) : [];
      arr.unshift({ text: text, timestamp: Date.now() });
      localStorage.setItem(KEYS.recentActivity, JSON.stringify(arr.slice(0, MAX_ACTIVITY)));
    } catch (e) {}
  }

  function showToast(message, isError) {
    var container = document.getElementById('la-toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'la-toast' + (isError ? ' la-toast--error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  function saveScaleToStorage() {
    var mapping = getScaleMapping();
    try {
      localStorage.setItem('likertScaleMapping', JSON.stringify(mapping));
      showToast('Scale saved.');
    } catch (e) {
      showToast('Could not save scale.', true);
    }
  }

  function loadScaleFromStorage() {
    try {
      var raw = localStorage.getItem('likertScaleMapping');
      if (!raw) return;
      var mapping = JSON.parse(raw);
      if (!Array.isArray(mapping) || mapping.length === 0) return;
      mapping.forEach(function (m) {
        var v = m.scaleValue;
        if (!v) return;
        var minEl = document.getElementById('la-scale-' + v + '-min');
        var maxEl = document.getElementById('la-scale-' + v + '-max');
        var labelEl = document.getElementById('la-scale-' + v + '-label');
        if (minEl && m.min != null) minEl.value = m.min;
        if (maxEl && m.max != null) maxEl.value = m.max;
        if (labelEl && m.label) labelEl.value = m.label;
      });
      updateScalePreview();
    } catch (e) {
      // ignore
    }
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getScaleMapping() {
    var mapping = [];
    for (var v = 5; v >= 1; v--) {
      var minEl = document.getElementById('la-scale-' + v + '-min');
      var maxEl = document.getElementById('la-scale-' + v + '-max');
      var labelEl = document.getElementById('la-scale-' + v + '-label');
      var minVal = minEl && minEl.value !== '' ? parseFloat(minEl.value) : null;
      var maxVal = maxEl && maxEl.value !== '' ? parseFloat(maxEl.value) : null;
      var label = labelEl && labelEl.value ? labelEl.value.trim() : '';
      mapping.push({
        min: minVal,
        max: maxVal,
        label: label,
        scaleValue: v
      });
    }
    return mapping;
  }

  function getQualitativeDescription(wm, mapping) {
    if (!mapping || !mapping.length) return '';
    for (var i = 0; i < mapping.length; i++) {
      var m = mapping[i];
      if (m.min != null && m.max != null && wm >= m.min && wm <= m.max && m.label) {
        return m.label;
      }
    }
    return '';
  }

  function resetScale() {
    for (var v = 5; v >= 1; v--) {
      var idx = 5 - v;
      var d = DEFAULT_SCALE[idx];
      var minEl = document.getElementById('la-scale-' + v + '-min');
      var maxEl = document.getElementById('la-scale-' + v + '-max');
      var labelEl = document.getElementById('la-scale-' + v + '-label');
      if (minEl) minEl.value = '';
      if (maxEl) maxEl.value = '';
      if (labelEl) labelEl.value = '';
    }
    updateScalePreview();
  }

  function updateScalePreview() {
    var list = document.getElementById('la-scale-preview');
    if (!list) return;
    var mapping = getScaleMapping();
    list.innerHTML = '';
    var hasAny = mapping.some(function (m) {
      return (m.min != null || m.max != null) && m.label;
    });
    if (!hasAny) {
      var li = document.createElement('li');
      li.className = 'la-scale-preview-empty';
      li.textContent = 'Define scale mapping above.';
      list.appendChild(li);
      return;
    }
    mapping.forEach(function (m) {
      if (m.min != null && m.max != null && m.label) {
        var li = document.createElement('li');
        li.textContent = m.min + '–' + m.max + ' = ' + m.label;
        list.appendChild(li);
      }
    });
  }

  function updateScaleSectionVisibility() {
    var section = document.getElementById('la-scale-section');
    var autoQd = document.getElementById('la-qd-mode-auto');
    var toggle = document.getElementById('la-scale-toggle');
    var body = document.getElementById('la-scale-body');
    if (!section || !autoQd) return;
    var show = !!autoQd.checked;
    if (show) {
      section.classList.remove('la-scale-section--hidden');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      if (body) body.style.display = '';
    } else {
      section.classList.add('la-scale-section--hidden');
    }
  }

  function toggleScaleCollapse() {
    var body = document.getElementById('la-scale-body');
    var toggle = document.getElementById('la-scale-toggle');
    if (!body || !toggle) return;
    var expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    body.style.display = expanded ? 'none' : '';
  }

  function setQdMode(mode) {
    var useLoadedCheckbox = document.getElementById('la-use-loaded-qd-rank');
    var autoRankCheckbox = document.getElementById('la-auto-rank');
    var autoQdCheckbox = document.getElementById('la-qd-mode-auto');
    if (!useLoadedCheckbox || !autoRankCheckbox || !autoQdCheckbox) return;

    if (mode === 'auto-qd') {
      useLoadedCheckbox.checked = false;
      autoRankCheckbox.checked = true;
      autoQdCheckbox.checked = true;
      useLoadedQd = false;
    } else if (mode === 'auto-rank') {
      useLoadedCheckbox.checked = true;
      autoRankCheckbox.checked = true;
      autoQdCheckbox.checked = false;
      useLoadedQd = true;
    } else {
      useLoadedCheckbox.checked = true;
      autoRankCheckbox.checked = false;
      autoQdCheckbox.checked = false;
      useLoadedQd = true;
    }

    updateScaleSectionVisibility();

    if (usingPredefinedTable) {
      recomputeFromPredefinedTable();
    }
  }

  function toggleInterpretationExpand() {
    var block = document.getElementById('la-interpretation-block');
    var btn = document.getElementById('la-interpretation-toggle');
    if (!block || !btn) return;
    var isCollapsed = block.classList.toggle('is-collapsed');
    var span = btn.querySelector('span');
    var polyline = btn.querySelector('svg polyline');
    if (span) span.textContent = isCollapsed ? 'Expand' : 'Collapse';
    btn.setAttribute('aria-expanded', !isCollapsed);
    if (polyline) polyline.setAttribute('points', isCollapsed ? '6 9 12 15 18 9' : '18 15 12 9 6 15');
  }

  function updateSelectedTableSummary() {
    var pill = document.getElementById('la-selected-table-pill');
    var projectSelect = document.getElementById('la-project-select');
    var tableSelect = document.getElementById('la-table-select');
    if (!pill || !projectSelect || !tableSelect) return;
    if (!tableSelect.value) {
      pill.textContent = 'None selected';
      return;
    }
    var projOpt = projectSelect.options[projectSelect.selectedIndex];
    var tableOpt = tableSelect.options[tableSelect.selectedIndex];
    var projText = projOpt ? projOpt.text : '';
    var tableText = tableOpt ? tableOpt.text : '';
    pill.textContent = tableText + (projText ? ' • ' + projText : '');
  }

  function setRowDensity(mode) {
    var table = document.getElementById('la-output-table');
    if (!table) return;
    if (mode === 'compact') {
      table.classList.add('la-table--compact');
    } else {
      table.classList.remove('la-table--compact');
    }
  }

  // ---------- Predefined table loading ----------
  function renderPredefinedTableRows(config) {
    var tbody = document.getElementById('la-output-tbody');
    var thead = document.getElementById('la-output-thead');
    var tfoot = document.getElementById('la-output-tfoot');
    var tableWrap = document.getElementById('la-table-wrap');
    var awmVal = document.getElementById('la-awm-value');
    var awmDescEl = document.getElementById('la-awm-desc');
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    var saveInputBtn = document.getElementById('la-save-input');
    if (!tbody || !config) return;

    if (tableWrap) tableWrap.classList.remove('la-thesis-table--two-group');
    if (thead) {
      thead.innerHTML =
        '<tr>' +
          '<th class="la-thesis-table__th la-thesis-table__th--particulars">Particulars</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--num">W.M.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--qd">Q.D.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--rank">Rank</th>' +
        '</tr>';
    }
    if (tfoot) {
      tfoot.innerHTML =
        '<tr class="la-thesis-table__footer-row">' +
          '<td class="la-thesis-table__footer-label"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-value">' + config.awm.toFixed(2) + '</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-desc">' + (config.awmDesc || '—') + '</strong></td>' +
          '<td class="la-thesis-table__footer-value"></td>' +
        '</tr>';
    }

    tbody.innerHTML = '';
    config.rows.forEach(function (row, idx) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-la-row-index', String(idx));
      tr.innerHTML =
        '<td class="la-thesis-table__td la-thesis-table__td--indicator">' + escapeHtml(row.indicator) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-wm value="' + row.wm.toFixed(2) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-qd value="' + escapeHtml(row.qd) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-rank>' + (row.rank % 1 === 0 ? row.rank : row.rank.toFixed(1)) + '</td>';
      tbody.appendChild(tr);
    });

    awmVal = document.getElementById('la-awm-value');
    awmDescEl = document.getElementById('la-awm-desc');
    if (awmVal) awmVal.textContent = config.awm.toFixed(2);
    if (awmDescEl) awmDescEl.textContent = config.awmDesc || '—';

    if (recomputeBtn) recomputeBtn.disabled = false;
    if (restoreBtn) restoreBtn.disabled = false;
    if (saveInputBtn) saveInputBtn.disabled = false;
  }

  function getConfigForProject(projectId, tableId) {
    if (projectId === 'rp2') return RP2_TABLE_CONFIGS[tableId] || null;
    return LIKERT_TABLE_CONFIGS[tableId] || null;
  }

  function loadLikertTable(id) {
    var config = getConfigForProject(activeProjectId, id);
    var titleEl = document.getElementById('la-table-title');
    if (!config || !titleEl) {
      if (typeof console !== 'undefined' && console.log) {
        console.log('Likert: loadLikertTable skipped — no config for', activeProjectId, id);
      }
      return;
    }

    activeTableId = id;
    activeTableData = config;
    usingPredefinedTable = true;
    currentLikertConfig = JSON.parse(JSON.stringify(config)); // deep copy for editing

    if (typeof console !== 'undefined' && console.log) {
      console.log('Likert: Loading', activeProjectId, id, config.title, (config.rows || []).length, 'indicators');
    }

    titleEl.value = config.title;
    computedData = {
      indicators: (config.rows || []).map(function (r) {
        return {
          indicator: r.indicator,
          weightedMean: r.wm,
          qualitativeDescription: r.qd,
          rank: r.rank,
          total: null
        };
      }),
      awm: config.awm,
      awmDesc: config.awmDesc,
      tableTitle: config.title,
      theme: config.theme,
      scaleMapping: getScaleMapping()
    };

    renderPredefinedTableRows(currentLikertConfig);
    generateInterpretation();
    updateLiveStats(computedData.awm, computedData.awmDesc);

    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveBtn = document.getElementById('la-save-interpretation');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (regenBtn) regenBtn.disabled = false;

    onInputChange();
  }

  // ---------- RP2 T-test table rendering ----------
  function renderTTestTable(config) {
    var thead = document.getElementById('la-output-thead');
    var tbody = document.getElementById('la-output-tbody');
    var tfoot = document.getElementById('la-output-tfoot');
    var tableWrap = document.getElementById('la-table-wrap');
    if (!thead || !tbody || !tfoot || !config) return;

    if (tableWrap) tableWrap.classList.remove('la-thesis-table--two-group');

    thead.innerHTML =
      '<tr>' +
        '<th class="la-thesis-table__th la-thesis-table__th--particulars">Particulars</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--num">t-value</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--qd">t-critical</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--rank">p-value</th>' +
        '<th class="la-thesis-table__th">Decision</th>' +
        '<th class="la-thesis-table__th">Description</th>' +
      '</tr>';

    tbody.innerHTML = '';
    (config.rows || []).forEach(function (row, idx) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="la-thesis-table__td la-thesis-table__td--indicator">' + (idx + 1) + '. ' + escapeHtml(row.label) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num">' + escapeHtml(String(row.tValue || '')) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd">' + escapeHtml(String(row.tCritical || '')) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank">' + escapeHtml(String(row.pValue || '')) + '</td>' +
        '<td class="la-thesis-table__td">' + escapeHtml(String(row.decision || '')) + '</td>' +
        '<td class="la-thesis-table__td">' + escapeHtml(String(row.description || '')) + '</td>';
      tbody.appendChild(tr);
    });

    tfoot.innerHTML =
      '<tr class="la-thesis-table__footer-row">' +
        '<td colspan="6" class="la-thesis-table__footer-label"></td>' +
      '</tr>';
  }

  // ---------- RP2 two-group weighted table rendering ----------
  function renderTwoGroupWeighted(config) {
    var thead = document.getElementById('la-output-thead');
    var tbody = document.getElementById('la-output-tbody');
    var tfoot = document.getElementById('la-output-tfoot');
    var tableWrap = document.getElementById('la-table-wrap');
    if (!thead || !tbody || !tfoot || !config) return;

    if (tableWrap) tableWrap.classList.add('la-thesis-table--two-group');

    thead.innerHTML =
      '<tr class="la-thesis-table__group-row">' +
        '<th rowspan="2" class="la-thesis-table__th la-thesis-table__th--particulars">Particulars</th>' +
        '<th colspan="3" class="la-thesis-table__th la-thesis-table__th--group">School Heads</th>' +
        '<th colspan="3" class="la-thesis-table__th la-thesis-table__th--group">Teachers</th>' +
      '</tr>' +
      '<tr class="la-thesis-table__subhead-row">' +
        '<th class="la-thesis-table__th la-thesis-table__th--num">W.M.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--qd">Q.D.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--rank">Rank</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--num">W.M.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--qd">Q.D.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--rank">Rank</th>' +
      '</tr>';

    tbody.innerHTML = '';
    config.rows.forEach(function (row, idx) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-la-row-index', String(idx));
      tr.innerHTML =
        '<td class="la-thesis-table__td la-thesis-table__td--indicator">' + escapeHtml(row.indicator) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-sh-wm value="' + row.sh.wm.toFixed(2) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-sh-qd value="' + escapeHtml(row.sh.qd) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-sh-rank>' + (row.sh.rank % 1 === 0 ? row.sh.rank : row.sh.rank.toFixed(1)) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-t-wm value="' + row.t.wm.toFixed(2) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-t-qd value="' + escapeHtml(row.t.qd) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-t-rank>' + (row.t.rank % 1 === 0 ? row.t.rank : row.t.rank.toFixed(1)) + '</td>';
      tbody.appendChild(tr);
    });

    tfoot.innerHTML =
      '<tr class="la-thesis-table__footer-row">' +
        '<td class="la-thesis-table__footer-label"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-sh-value">' + config.awm.sh.value.toFixed(2) + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-sh-desc">' + escapeHtml(config.awm.sh.qd) + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-t-value">' + config.awm.t.value.toFixed(2) + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-t-desc">' + escapeHtml(config.awm.t.qd) + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"></td>' +
      '</tr>';
  }

  function loadRp2Table(id) {
    var config = getConfigForProject(activeProjectId, id);
    var titleEl = document.getElementById('la-table-title');
    if (!config || !titleEl) {
      if (typeof console !== 'undefined' && console.log) {
        console.log('Likert: loadRp2Table skipped — no config for', activeProjectId, id);
      }
      return;
    }

    activeTableId = id;
    activeTableData = config;
    usingPredefinedTable = true;
    currentLikertConfig = JSON.parse(JSON.stringify(config));
    currentTwoGroupData = null;

    if (typeof console !== 'undefined' && console.log) {
      var rowCount = (config.rows || []).length;
      console.log('Likert: Loading', activeProjectId, id, config.title, rowCount, 'indicators');
    }

    titleEl.value = config.title;
    if (config.type === 'tTest') {
      renderTTestTable(currentLikertConfig);
    } else {
      renderTwoGroupWeighted(currentLikertConfig);
    }

    // Initialize computedData for interpretation
    computedData = {
      indicators: [],
      awm: 0,
      awmDesc: '',
      tableTitle: config.title,
      theme: '',
      scaleMapping: getScaleMapping()
    };

    var block = document.getElementById('la-interpretation-block');
    var interpTabs = document.getElementById('la-interp-tabs');
    laInterpTwoGroup = false;
    if (interpTabs) interpTabs.hidden = true;
    if (block) {
      if (config.type !== 'tTest' && config.rows && config.rows.length) {
        generateTwoGroupInterpretations(0, '');
        laInterpTwoGroup = true;
        if (block) block.textContent = laInterpretationSh;
        if (interpTabs) interpTabs.hidden = false;
      } else if (config.prewritten) {
        var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
        var includeImplications = true;
        var implEl = document.getElementById('la-include-implications');
        if (implEl) includeImplications = implEl.checked;
        var impl = Utils && includeImplications ? Utils.buildImplications(config.type === 'tTest' ? 'ttest' : 'executive') : null;
        var implSuffix = impl ? ' ' + impl.first + ' ' + impl.second : '';
        var prewrittenText = (config.prewritten.sh || '') + (config.prewritten.t ? ' ' + config.prewritten.t : '');
        if (includeImplications && Utils && prewrittenText) prewrittenText += implSuffix;
        block.textContent = prewrittenText;
      }
    }

    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveBtn = document.getElementById('la-save-interpretation');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    var saveInputBtn = document.getElementById('la-save-input');
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (regenBtn) regenBtn.disabled = false;
    if (recomputeBtn) recomputeBtn.disabled = false;
    if (restoreBtn) restoreBtn.disabled = false;
    if (saveInputBtn) saveInputBtn.disabled = false;
    var awmVal = config.awm && config.awm.sh ? config.awm.sh.value : 0;
    var awmDesc = config.awm && config.awm.sh ? config.awm.sh.qd : '—';
    updateLiveStats(awmVal, awmDesc);
    onInputChange();
  }

  function addRow() {
    var tbody = document.getElementById('la-input-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="la-input la-input--indicator" placeholder="Indicator" data-la-indicator></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c5></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c4></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c3></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c2></td>' +
      '<td><input type="number" class="la-input la-input--count" min="0" step="1" value="" placeholder="0" data-la-c1></td>' +
      '<td><button type="button" class="la-row-remove" aria-label="Remove row" data-la-remove>×</button></td>';
    tbody.appendChild(tr);
    tr.querySelector('[data-la-remove]').addEventListener('click', function () {
      removeRow(tr);
    });
    tr.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', onInputChange);
    });
    onInputChange();
  }

  function removeRow(tr) {
    var tbody = document.getElementById('la-input-tbody');
    if (tbody && tr.parentNode === tbody) {
      tbody.removeChild(tr);
      onInputChange();
    }
  }

  function removeLastRow() {
    var tbody = document.getElementById('la-input-tbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    if (rows.length > 0) {
      removeRow(rows[rows.length - 1]);
    }
  }

  function getInputRows() {
    var tbody = document.getElementById('la-input-tbody');
    if (!tbody) return [];
    var rows = [];
    tbody.querySelectorAll('tr').forEach(function (tr) {
      var ind = tr.querySelector('[data-la-indicator]');
      var c5 = tr.querySelector('[data-la-c5]');
      var c4 = tr.querySelector('[data-la-c4]');
      var c3 = tr.querySelector('[data-la-c3]');
      var c2 = tr.querySelector('[data-la-c2]');
      var c1 = tr.querySelector('[data-la-c1]');
      var indicator = (ind && ind.value || '').trim();
      var n5 = parseInt(c5 && c5.value || '0', 10) || 0;
      var n4 = parseInt(c4 && c4.value || '0', 10) || 0;
      var n3 = parseInt(c3 && c3.value || '0', 10) || 0;
      var n2 = parseInt(c2 && c2.value || '0', 10) || 0;
      var n1 = parseInt(c1 && c1.value || '0', 10) || 0;
      if (isNaN(n5) || n5 < 0) n5 = 0;
      if (isNaN(n4) || n4 < 0) n4 = 0;
      if (isNaN(n3) || n3 < 0) n3 = 0;
      if (isNaN(n2) || n2 < 0) n2 = 0;
      if (isNaN(n1) || n1 < 0) n1 = 0;
      rows.push({
        indicator: indicator,
        n5: n5, n4: n4, n3: n3, n2: n2, n1: n1,
        total: n5 + n4 + n3 + n2 + n1
      });
    });
    return rows;
  }

  function validate() {
    var errTitle = document.getElementById('la-table-title-error');
    var errScale = document.getElementById('la-scale-error');
    var errInd = document.getElementById('la-indicators-error');
    var titleEl = document.getElementById('la-table-title');
    if (errTitle) errTitle.textContent = '';
    if (errScale) errScale.textContent = '';
    if (errInd) errInd.textContent = '';
    if (titleEl) titleEl.classList.remove('error');

    var title = (titleEl && titleEl.value || '').trim();
    if (!title) {
      if (errTitle) errTitle.textContent = 'Enter a table title or theme.';
      if (titleEl) titleEl.classList.add('error');
      return false;
    }

    var mapping = getScaleMapping();
    var hasValidScale = mapping.some(function (m) {
      return m.min != null && m.max != null && m.label;
    });
    if (!hasValidScale) {
      if (errScale) errScale.textContent = 'Define at least one scale range and label.';
      return false;
    }

    var rows = getInputRows();
    var validRows = rows.filter(function (r) {
      return r.indicator && r.total > 0;
    });
    if (validRows.length === 0) {
      if (errInd) errInd.textContent = 'Add at least one indicator with valid non-negative counts.';
      return false;
    }
    var hasEmptyIndicator = rows.some(function (r) {
      return r.total > 0 && !r.indicator;
    });
    if (hasEmptyIndicator) {
      if (errInd) errInd.textContent = 'Indicator cannot be empty when counts are entered.';
      return false;
    }
    return true;
  }

  function computeWeightedMean(row) {
    var sum = 5 * row.n5 + 4 * row.n4 + 3 * row.n3 + 2 * row.n2 + 1 * row.n1;
    var total = row.total;
    if (total === 0) return 0;
    return Math.round((sum / total) * 100) / 100;
  }

  function computeRanks(sortedByWm) {
    var i = 0;
    while (i < sortedByWm.length) {
      var j = i;
      while (j < sortedByWm.length && sortedByWm[j].weightedMean === sortedByWm[i].weightedMean) {
        j++;
      }
      var avgRank = (i + 1 + j) / 2;
      for (var k = i; k < j; k++) {
        sortedByWm[k].rank = avgRank;
      }
      i = j;
    }
    return sortedByWm;
  }

  function getQdPriority(qd) {
    if (!qd) return 0;
    var code = qd.trim().toUpperCase();
    // Higher value = higher group
    var map = {
      VO: 5,
      O: 4,
      VE: 5,
      E: 4,
      FR: 5,
      R: 4,
      S: 3,
      MS: 2
    };
    return map[code] != null ? map[code] : 1;
  }

  function recomputeFromPredefinedTable() {
    if (!usingPredefinedTable || !currentLikertConfig) return;
    var tbody = document.getElementById('la-output-tbody');
    if (!tbody) return;

    // RP1: single-group tables
    if (activeProjectId === 'rp1') {
      var rows = [];
      tbody.querySelectorAll('tr').forEach(function (tr, idx) {
        var ind = currentLikertConfig.rows[idx] && currentLikertConfig.rows[idx].indicator;
        var wmInput = tr.querySelector('[data-la-wm]');
        var qdInput = tr.querySelector('[data-la-qd]');
        var wmVal = wmInput && wmInput.value !== '' ? parseFloat(wmInput.value) : NaN;
        if (isNaN(wmVal)) wmVal = 0;
        var qdVal = qdInput && qdInput.value ? qdInput.value.trim() : '';
        rows.push({
          indicator: ind || '',
          weightedMean: wmVal,
          qualitativeDescription: qdVal,
          rank: null
        });
      });

      // Sort by WM desc and apply average-of-positions ranking
      var sorted = rows.slice().sort(function (a, b) {
        return b.weightedMean - a.weightedMean;
      });
      computeRanks(sorted);
      var rankMap = {};
      sorted.forEach(function (r) {
        rankMap[r.indicator] = r.rank;
      });
      rows.forEach(function (r) {
        r.rank = rankMap[r.indicator];
      });

      // Auto Q.D. mode
      if (!useLoadedQd) {
        var mapping = getScaleMapping();
        rows.forEach(function (r) {
          r.qualitativeDescription = getQualitativeDescription(r.weightedMean, mapping);
        });
      }

      // Update DOM ranks/Q.D.
      tbody.querySelectorAll('tr').forEach(function (tr, idx) {
        var row = rows[idx];
        var rankCell = tr.querySelector('[data-la-rank]');
        var qdInput = tr.querySelector('[data-la-qd]');
        if (rankCell) {
          var rv = row.rank;
          rankCell.textContent = rv % 1 === 0 ? rv : rv.toFixed(1);
        }
        if (qdInput && row.qualitativeDescription != null) {
          qdInput.value = row.qualitativeDescription;
        }
      });

      // Recompute AWM
      var awm = rows.length
        ? Math.round(rows.reduce(function (s, r) { return s + r.weightedMean; }, 0) / rows.length * 100) / 100
        : 0;
      var awmMapping = getScaleMapping();
      var awmDesc = useLoadedQd ? (currentLikertConfig.awmDesc || '') : getQualitativeDescription(awm, awmMapping);

      var awmVal = document.getElementById('la-awm-value');
      var awmDescEl = document.getElementById('la-awm-desc');
      if (awmVal) awmVal.textContent = awm.toFixed(2);
      if (awmDescEl) awmDescEl.textContent = awmDesc || '—';

      computedData = {
        indicators: rows,
        awm: awm,
        awmDesc: awmDesc,
        tableTitle: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value || '').trim(),
        theme: currentLikertConfig.theme,
        scaleMapping: awmMapping
      };

      generateInterpretation();
      updateLiveStats(awm, awmDesc);
      return;
    }

    // RP2: two-group weighted tables
    var autoRank = document.getElementById('la-auto-rank');
    var autoQd = document.getElementById('la-qd-mode-auto');
    var doAutoRank = !!(autoRank && autoRank.checked);
    var doAutoQd = !!(autoQd && autoQd.checked);

    var rowsSh = [];
    var rowsT = [];

    tbody.querySelectorAll('tr').forEach(function (tr, idx) {
      var base = currentLikertConfig.rows[idx];
      if (!base) return;
      var ind = base.indicator;
      var shWmInput = tr.querySelector('[data-la-sh-wm]');
      var shQdInput = tr.querySelector('[data-la-sh-qd]');
      var tWmInput = tr.querySelector('[data-la-t-wm]');
      var tQdInput = tr.querySelector('[data-la-t-qd]');
      var shWm = shWmInput && shWmInput.value !== '' ? parseFloat(shWmInput.value) : base.sh.wm;
      var tWm = tWmInput && tWmInput.value !== '' ? parseFloat(tWmInput.value) : base.t.wm;
      if (isNaN(shWm)) shWm = 0;
      if (isNaN(tWm)) tWm = 0;
      var shQd = shQdInput && shQdInput.value ? shQdInput.value.trim() : base.sh.qd;
      var tQd = tQdInput && tQdInput.value ? tQdInput.value.trim() : base.t.qd;
      rowsSh.push({ indicator: ind, weightedMean: shWm, qualitativeDescription: shQd, rank: null });
      rowsT.push({ indicator: ind, weightedMean: tWm, qualitativeDescription: tQd, rank: null });
    });

    var mapping2 = getScaleMapping();

    if (doAutoRank) {
      computeRanks(rowsSh.slice().sort(function (a, b) { return b.weightedMean - a.weightedMean; }));
      computeRanks(rowsT.slice().sort(function (a, b) { return b.weightedMean - a.weightedMean; }));
    }
    if (doAutoQd) {
      rowsSh.forEach(function (r) { r.qualitativeDescription = getQualitativeDescription(r.weightedMean, mapping2); });
      rowsT.forEach(function (r) { r.qualitativeDescription = getQualitativeDescription(r.weightedMean, mapping2); });
    }

    // Update DOM
    tbody.querySelectorAll('tr').forEach(function (tr, idx) {
      var rs = rowsSh[idx];
      var rt = rowsT[idx];
      var shRankCell = tr.querySelector('[data-la-sh-rank]');
      var tRankCell = tr.querySelector('[data-la-t-rank]');
      var shQdInput = tr.querySelector('[data-la-sh-qd]');
      var tQdInput = tr.querySelector('[data-la-t-qd]');
      if (shRankCell && rs.rank != null) {
        var rvs = rs.rank;
        shRankCell.textContent = rvs % 1 === 0 ? rvs : rvs.toFixed(1);
      }
      if (tRankCell && rt.rank != null) {
        var rvt = rt.rank;
        tRankCell.textContent = rvt % 1 === 0 ? rvt : rvt.toFixed(1);
      }
      if (shQdInput && rs.qualitativeDescription != null) shQdInput.value = rs.qualitativeDescription;
      if (tQdInput && rt.qualitativeDescription != null) tQdInput.value = rt.qualitativeDescription;
    });

    // Recompute AWM per group
    var awmSh = rowsSh.length ? Math.round(rowsSh.reduce(function (s, r) { return s + r.weightedMean; }, 0) / rowsSh.length * 100) / 100 : 0;
    var awmT = rowsT.length ? Math.round(rowsT.reduce(function (s, r) { return s + r.weightedMean; }, 0) / rowsT.length * 100) / 100 : 0;
    var awmShDesc = doAutoQd ? getQualitativeDescription(awmSh, mapping2) : (currentLikertConfig.awm && currentLikertConfig.awm.sh && currentLikertConfig.awm.sh.qd) || '';
    var awmTDesc = doAutoQd ? getQualitativeDescription(awmT, mapping2) : (currentLikertConfig.awm && currentLikertConfig.awm.t && currentLikertConfig.awm.t.qd) || '';

    var awmShValEl = document.getElementById('la-awm-sh-value');
    var awmShDescEl = document.getElementById('la-awm-sh-desc');
    var awmTValEl = document.getElementById('la-awm-t-value');
    var awmTDescEl = document.getElementById('la-awm-t-desc');
    if (awmShValEl) awmShValEl.textContent = awmSh.toFixed(2);
    if (awmShDescEl) awmShDescEl.textContent = awmShDesc || '—';
    if (awmTValEl) awmTValEl.textContent = awmT.toFixed(2);
    if (awmTDescEl) awmTDescEl.textContent = awmTDesc || '—';

    currentTwoGroupData = {
      rowsSh: rowsSh,
      rowsT: rowsT,
      awmSh: awmSh,
      awmT: awmT,
      awmShDesc: awmShDesc,
      awmTDesc: awmTDesc,
      themeSh: currentLikertConfig.themeHeads || currentLikertConfig.theme || currentLikertConfig.title || 'the theme',
      themeT: currentLikertConfig.themeTeachers || currentLikertConfig.theme || currentLikertConfig.title || 'the theme'
    };
    computedData = {
      indicators: [],
      awm: 0,
      awmDesc: '',
      tableTitle: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value || '').trim(),
      theme: '',
      scaleMapping: mapping2
    };
    generateTwoGroupInterpretations(0, '');
    laInterpTwoGroup = true;
    var block = document.getElementById('la-interpretation-block');
    var interpTabs = document.getElementById('la-interp-tabs');
    if (block) block.textContent = laInterpretationSh;
    if (interpTabs) interpTabs.hidden = false;
  }

  function onInputChange() {
    // In the new dropdown-based flow, live indicators are simply the number of loaded rows.
    var liveInd = document.getElementById('la-live-indicators');
    if (liveInd && currentLikertConfig && currentLikertConfig.rows) {
      liveInd.textContent = currentLikertConfig.rows.length;
    }
  }

  function compute() {
    if (!validate()) return;
    var rows = getInputRows();
    var validRows = rows.filter(function (r) {
      return r.indicator && r.total > 0;
    });
    var mapping = getScaleMapping();

    var results = validRows.map(function (r) {
      var wm = computeWeightedMean(r);
      var qd = getQualitativeDescription(wm, mapping);
      return {
        indicator: r.indicator,
        weightedMean: wm,
        qualitativeDescription: qd,
        total: r.total,
        n5: r.n5, n4: r.n4, n3: r.n3, n2: r.n2, n1: r.n1
      };
    });

    var sorted = results.slice().sort(function (a, b) {
      return b.weightedMean - a.weightedMean;
    });
    computeRanks(sorted);
    var rankMap = {};
    sorted.forEach(function (r) {
      rankMap[r.indicator] = r.rank;
    });
    results.forEach(function (r) {
      r.rank = rankMap[r.indicator];
    });

    var awm = results.length > 0
      ? Math.round(results.reduce(function (s, r) { return s + r.weightedMean; }, 0) / results.length * 100) / 100
      : 0;
    var awmDesc = getQualitativeDescription(awm, mapping);

    var tableTitle = (document.getElementById('la-table-title') && document.getElementById('la-table-title').value || '').trim();
    var themeFromTitle = tableTitle ? tableTitle.replace(/^Table\s+\d+\.\s*/i, '').trim() : '';
    computedData = {
      indicators: results,
      awm: awm,
      awmDesc: awmDesc,
      tableTitle: tableTitle,
      theme: themeFromTitle ? (themeFromTitle.toLowerCase().indexOf('the ') === 0 ? themeFromTitle.toLowerCase() : 'the ' + themeFromTitle.toLowerCase()) : tableTitle,
      scaleMapping: mapping
    };

    renderOutput(results, awm, awmDesc);
    generateInterpretation();
    updateLiveStats(awm, awmDesc);

    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveBtn = document.getElementById('la-save-interpretation');
    var saveInputBtn = document.getElementById('la-save-input');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (saveInputBtn) saveInputBtn.disabled = false;
    if (regenBtn) regenBtn.disabled = false;
  }

  function renderOutput(results, awm, awmDesc) {
    var tbody = document.getElementById('la-output-tbody');
    var footer = document.getElementById('la-output-footer');
    var awmVal = document.getElementById('la-awm-value');
    var awmDescEl = document.getElementById('la-awm-desc');
    if (!tbody) return;

    tbody.innerHTML = '';
    results.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(r.indicator) + '</td>' +
        '<td>' + r.weightedMean.toFixed(2) + '</td>' +
        '<td>' + escapeHtml(r.qualitativeDescription) + '</td>' +
        '<td>' + (r.rank % 1 === 0 ? r.rank : r.rank.toFixed(1)) + '</td>' +
        '<td>' + r.total + '</td>';
      tbody.appendChild(tr);
    });

    if (footer) {
      footer.hidden = false;
      if (awmVal) awmVal.textContent = awm.toFixed(2);
      if (awmDescEl) awmDescEl.textContent = awmDesc || '—';
    }
  }

  function joinWithAnd(labels) {
    if (!labels.length) return '';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels[0] + ' and ' + labels[1];
    return labels.slice(0, -1).join(', ') + ', and ' + labels[labels.length - 1];
  }

  /** Build one interpretation for a group: opener + enumeration + AWM + implications. No rank, no Q.D. grouping. */
  function buildOneGroupInterpretation(rows, awm, awmDesc, theme, groupLabel, variantIndex, lastOpener) {
    if (!rows || !rows.length) return '';
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var includeImplications = true;
    var implEl = document.getElementById('la-include-implications');
    if (implEl) includeImplications = implEl.checked;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;

    var opening = Gen
      ? Gen.getOpenerForVariant(vi, lastOpener)
      : getOpener();
    if (!Gen && !Utils) openingIndex += 1;

    var sorted = rows.slice().sort(function (a, b) {
      return b.weightedMean - a.weightedMean;
    });

    var clauses = [];
    var i = 0;
    while (i < sorted.length) {
      var j = i + 1;
      while (j < sorted.length && sorted[j].weightedMean === sorted[i].weightedMean) {
        j++;
      }
      var group = sorted.slice(i, j);
      var labels = group.map(function (r) { return '"' + r.indicator + '"'; });
      var wm = group[0].weightedMean.toFixed(2);
      if (group.length === 1) {
        clauses.push(labels[0] + ' with a weighted mean of ' + wm);
      } else {
        clauses.push(joinWithAnd(labels) + ' each with a weighted mean of ' + wm);
      }
      i = j;
    }

    var sent1 = opening + theme + ', ';
    var sent2 = 'the indicators include ' + clauses.join('; ') + '.';
    var awmStr = awm.toFixed(2);
    var desc = (awmDesc || '—').toLowerCase();
    var themeForAwm = theme.indexOf('the ') === 0 ? theme : 'the ' + theme;
    var sent3 = 'The average weighted mean of ' + awmStr + ' signifies that ' + groupLabel + ' view ' + themeForAwm + ' as ' + desc + '.';
    var text = sent1 + sent2 + ' ' + sent3;
    if (includeImplications) {
      var impl = Gen
        ? Gen.buildImplicationsWithVariant('likert', vi)
        : (Utils ? Utils.buildImplications('likert') : { first: '', second: '' });
      if (impl.first) text += ' ' + impl.first;
      if (impl.second) text += ' ' + impl.second;
    }
    return text;
  }

  function generateInterpretationWithVariant(variantIndex, lastOpener) {
    var data = computedData;
    if (!data.indicators.length) return '';
    var theme = data.theme || data.tableTitle || 'the theme';
    return buildOneGroupInterpretation(
      data.indicators,
      data.awm,
      data.awmDesc,
      theme,
      'teachers',
      variantIndex,
      lastOpener
    );
  }

  /** Generate two interpretations for two-group tables. Uses different openers for each group. */
  function generateTwoGroupInterpretations(variantIndex, lastOpener) {
    if (!currentLikertConfig || currentLikertConfig.type === 'tTest') return;
    var rowsSh, rowsT, awmSh, awmT, awmShDesc, awmTDesc, themeSh, themeT;
    if (currentTwoGroupData) {
      rowsSh = currentTwoGroupData.rowsSh;
      rowsT = currentTwoGroupData.rowsT;
      awmSh = currentTwoGroupData.awmSh;
      awmT = currentTwoGroupData.awmT;
      awmShDesc = currentTwoGroupData.awmShDesc;
      awmTDesc = currentTwoGroupData.awmTDesc;
      themeSh = currentTwoGroupData.themeSh;
      themeT = currentTwoGroupData.themeT;
    } else {
      var rows = currentLikertConfig.rows || [];
      if (!rows.length) return;
      rowsSh = rows.map(function (r) {
        return { indicator: r.indicator, weightedMean: r.sh && typeof r.sh.wm === 'number' ? r.sh.wm : 0 };
      });
      rowsT = rows.map(function (r) {
        return { indicator: r.indicator, weightedMean: r.t && typeof r.t.wm === 'number' ? r.t.wm : 0 };
      });
      awmSh = currentLikertConfig.awm && currentLikertConfig.awm.sh ? currentLikertConfig.awm.sh.value : 0;
      awmT = currentLikertConfig.awm && currentLikertConfig.awm.t ? currentLikertConfig.awm.t.value : 0;
      awmShDesc = currentLikertConfig.awm && currentLikertConfig.awm.sh ? currentLikertConfig.awm.sh.qd : '—';
      awmTDesc = currentLikertConfig.awm && currentLikertConfig.awm.t ? currentLikertConfig.awm.t.qd : '—';
      themeSh = currentLikertConfig.themeHeads || currentLikertConfig.theme || currentLikertConfig.title || 'the theme';
      themeT = currentLikertConfig.themeTeachers || currentLikertConfig.theme || currentLikertConfig.title || 'the theme';
    }
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;
    laInterpretationSh = buildOneGroupInterpretation(rowsSh, awmSh, awmShDesc, themeSh, 'school heads', vi, lastOpener);
    var firstOpener = '';
    if (typeof ThesisInterpretationUtils !== 'undefined' && ThesisInterpretationUtils.OPENER_POOL) {
      for (var k = 0; k < ThesisInterpretationUtils.OPENER_POOL.length; k++) {
        if (laInterpretationSh.indexOf(ThesisInterpretationUtils.OPENER_POOL[k]) === 0) {
          firstOpener = ThesisInterpretationUtils.OPENER_POOL[k];
          break;
        }
      }
    }
    if (!firstOpener && typeof ThesisTextGenerator !== 'undefined' && ThesisTextGenerator.OPENER_POOL) {
      for (var k = 0; k < ThesisTextGenerator.OPENER_POOL.length; k++) {
        if (laInterpretationSh.indexOf(ThesisTextGenerator.OPENER_POOL[k]) === 0) {
          firstOpener = ThesisTextGenerator.OPENER_POOL[k];
          break;
        }
      }
    }
    laInterpretationT = buildOneGroupInterpretation(rowsT, awmT, awmTDesc, themeT, 'teachers', vi + 1, firstOpener);
  }

  function generateInterpretation() {
    var data = computedData;
    if (!data.indicators.length) return '';

    var block = document.getElementById('la-interpretation-block');
    if (!block) return '';

    var text = generateInterpretationWithVariant(0, '');
    block.textContent = text;
    return text;
  }

  function regenerateInterpretation() {
    var block = document.getElementById('la-interpretation-block');
    if (!block) return;
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;

    function setFullInterpretation(text) {
      block.textContent = '';
      block.textContent = (text || '').trim();
    }

    if (activeProjectId === 'rp2' && currentLikertConfig && currentLikertConfig.type !== 'tTest' && (currentLikertConfig.rows || currentTwoGroupData)) {
      var tableId = (currentLikertConfig.id || currentLikertConfig.title || 'likert').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      var generator = function (vi, lastOpener) {
        generateTwoGroupInterpretations(vi, lastOpener);
        return laInterpretationSh + '\n\n' + laInterpretationT;
      };
      if (Gen) {
        Gen.generateWithVariation(generator, 'likert_rp2', tableId);
      } else {
        generateTwoGroupInterpretations(0, '');
      }
      if (block) block.textContent = laInterpretationSh;
      var interpTabs = document.getElementById('la-interp-tabs');
      if (interpTabs) interpTabs.hidden = false;
      showToast('Interpretation regenerated.');
      return;
    }
    if (activeProjectId === 'rp2' && currentLikertConfig && currentLikertConfig.prewritten && currentLikertConfig.type === 'tTest') {
      var prewrittenText = (currentLikertConfig.prewritten.sh || '') + (currentLikertConfig.prewritten.t ? ' ' + currentLikertConfig.prewritten.t : '');
      var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
      var implEl = document.getElementById('la-include-implications');
      if (implEl && implEl.checked && Utils && prewrittenText) {
        var impl = Utils.buildImplications('ttest');
        prewrittenText += ' ' + impl.first + ' ' + impl.second;
      }
      setFullInterpretation(prewrittenText);
      showToast('Interpretation regenerated.');
      return;
    }

    if (!computedData.indicators.length) return;
    if (!Gen) {
      var fallback = generateInterpretationWithVariant(0, '');
      setFullInterpretation(fallback);
      showToast('Interpretation regenerated.');
      return;
    }

    var tableId = (computedData.tableTitle || 'likert').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    var generator = function (vi, lastOpener) {
      return generateInterpretationWithVariant(vi, lastOpener);
    };
    var result = Gen.generateWithVariation(generator, 'likert', tableId);
    setFullInterpretation(result.text);
    showToast('Interpretation regenerated.');
  }

  function buildAwmSentence(awm, awmDesc, theme) {
    var awmStr = awm.toFixed(2);
    var desc = awmDesc || '—';
    return 'The average weighted mean of ' + awmStr + ' signifies that teachers view the ' + theme + ' as ' + desc.toLowerCase() + '.';
  }

  function updateLiveStats(awm, awmDesc) {
    var liveAwm = document.getElementById('la-live-awm');
    var liveAwmDesc = document.getElementById('la-live-awm-desc');
    if (liveAwm) liveAwm.textContent = awm != null ? awm.toFixed(2) : '—';
    if (liveAwmDesc) liveAwmDesc.textContent = awmDesc || '—';
  }

  function copyInterpretation() {
    var block = document.getElementById('la-interpretation-block');
    if (!block) return;
    var text = laInterpTwoGroup && laInterpretationSh && laInterpretationT
      ? 'School Heads:\n\n' + laInterpretationSh + '\n\nTeachers:\n\n' + laInterpretationT
      : block.textContent.trim();
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      showToast('Copied!');
    }).catch(function () {
      showToast('Copy failed.', true);
    });
  }

  function copyPrewrittenPart(groupKey) {
    if (!currentLikertConfig || !currentLikertConfig.prewritten) return;
    var text = currentLikertConfig.prewritten[groupKey] || '';
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(function () {
      showToast('Copied!');
    }).catch(function () {
      showToast('Copy failed.', true);
    });
  }

  function saveToReport() {
    var interpretation = document.getElementById('la-interpretation-block');
    var text = laInterpTwoGroup && laInterpretationSh && laInterpretationT
      ? 'School Heads:\n\n' + laInterpretationSh + '\n\nTeachers:\n\n' + laInterpretationT
      : (interpretation && interpretation.textContent ? interpretation.textContent.trim() : '');
    var tables = getLikertTables();
    var toSave = null;

    if (activeProjectId === 'rp2' && currentLikertConfig && usingPredefinedTable) {
      var tbody = document.getElementById('la-output-tbody');
      if (!tbody) return;
      if (currentLikertConfig.type === 'tTest') {
        var tTestRows = [];
        (currentLikertConfig.rows || []).forEach(function (row, idx) {
          tTestRows.push({
            label: row.label,
            tValue: row.tValue,
            tCritical: row.tCritical,
            pValue: row.pValue,
            decision: row.decision,
            description: row.description
          });
        });
        toSave = {
          type: 'tTest',
          tableTitle: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value || '').trim() || currentLikertConfig.title,
          rows: tTestRows,
          interpretation: text,
          createdAt: Date.now()
        };
      } else {
        var rows = [];
        tbody.querySelectorAll('tr').forEach(function (tr, idx) {
          var base = currentLikertConfig.rows[idx];
          if (!base) return;
          var shWmInput = tr.querySelector('[data-la-sh-wm]');
          var shQdInput = tr.querySelector('[data-la-sh-qd]');
          var tWmInput = tr.querySelector('[data-la-t-wm]');
          var tQdInput = tr.querySelector('[data-la-t-qd]');
          var shWm = shWmInput && shWmInput.value !== '' ? parseFloat(shWmInput.value) : base.sh.wm;
          var tWm = tWmInput && tWmInput.value !== '' ? parseFloat(tWmInput.value) : base.t.wm;
          if (isNaN(shWm)) shWm = 0;
          if (isNaN(tWm)) tWm = 0;
          var shQd = shQdInput && shQdInput.value ? shQdInput.value.trim() : base.sh.qd;
          var tQd = tQdInput && tQdInput.value ? tQdInput.value.trim() : base.t.qd;
          var shRankCell = tr.querySelector('[data-la-sh-rank]');
          var tRankCell = tr.querySelector('[data-la-t-rank]');
          var shRank = shRankCell && shRankCell.textContent ? parseFloat(shRankCell.textContent) : base.sh.rank;
          var tRank = tRankCell && tRankCell.textContent ? parseFloat(tRankCell.textContent) : base.t.rank;
          rows.push({
            indicator: base.indicator,
            sh: { wm: shWm, qd: shQd, rank: shRank },
            t: { wm: tWm, qd: tQd, rank: tRank }
          });
        });
        var awmShEl = document.getElementById('la-awm-sh-value');
        var awmTEl = document.getElementById('la-awm-t-value');
        var awmShDescEl = document.getElementById('la-awm-sh-desc');
        var awmTDescEl = document.getElementById('la-awm-t-desc');
        var awmSh = awmShEl && awmShEl.textContent ? parseFloat(awmShEl.textContent) : (currentLikertConfig.awm && currentLikertConfig.awm.sh ? currentLikertConfig.awm.sh.value : 0);
        var awmT = awmTEl && awmTEl.textContent ? parseFloat(awmTEl.textContent) : (currentLikertConfig.awm && currentLikertConfig.awm.t ? currentLikertConfig.awm.t.value : 0);
        var awmShDesc = awmShDescEl ? awmShDescEl.textContent : (currentLikertConfig.awm && currentLikertConfig.awm.sh ? currentLikertConfig.awm.sh.qd : '');
        var awmTDesc = awmTDescEl ? awmTDescEl.textContent : (currentLikertConfig.awm && currentLikertConfig.awm.t ? currentLikertConfig.awm.t.qd : '');
        toSave = {
          type: 'twoGroup',
          tableTitle: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value || '').trim() || currentLikertConfig.title,
          rows: rows,
          awm: { sh: { value: awmSh, qd: awmShDesc }, t: { value: awmT, qd: awmTDesc } },
          interpretation: text,
          createdAt: Date.now()
        };
      }
    } else if (computedData.indicators.length) {
      toSave = {
        tableTitle: computedData.tableTitle,
        scaleMapping: computedData.scaleMapping,
        indicators: computedData.indicators.map(function (r) {
          return {
            indicator: r.indicator,
            n5: r.n5 || 0, n4: r.n4 || 0, n3: r.n3 || 0, n2: r.n2 || 0, n1: r.n1 || 0,
            weightedMean: r.weightedMean,
            qualitativeDescription: r.qualitativeDescription,
            rank: r.rank,
            total: r.total || null
          };
        }),
        awm: computedData.awm,
        awmDesc: computedData.awmDesc,
        interpretation: text,
        createdAt: Date.now()
      };
    }

    if (!toSave) return;
    tables.push(toSave);
    try {
      localStorage.setItem(KEYS.likertTables, JSON.stringify(tables));
    } catch (e) {
      showToast('Save failed.', true);
      return;
    }

    setNumber(KEYS.tablesProcessed, getNumber(KEYS.tablesProcessed) + 1);
    setNumber(KEYS.interpretationsGenerated, getNumber(KEYS.interpretationsGenerated) + 1);
    setNumber(KEYS.reportsCreated, getNumber(KEYS.reportsCreated) + 1);
    localStorage.setItem(KEYS.likertDataSaved, 'true');
    appendActivity('Saved Likert table: ' + (toSave.tableTitle || 'Untitled'));
    updateSessionProgress();
    renderRecentActivity();
    showToast('Saved to report.');
  }

  function updateSessionProgress() {
    var tables = document.getElementById('la-session-tables');
    var interpretations = document.getElementById('la-session-interpretations');
    var reports = document.getElementById('la-session-reports');
    if (tables) tables.textContent = getNumber(KEYS.tablesProcessed);
    if (interpretations) interpretations.textContent = getNumber(KEYS.interpretationsGenerated);
    if (reports) reports.textContent = getNumber(KEYS.reportsCreated);
  }

  function getActivityList() {
    try {
      var raw = localStorage.getItem(KEYS.recentActivity);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, MAX_ACTIVITY) : [];
    } catch (e) {
      return [];
    }
  }

  function formatTime(timestamp) {
    if (timestamp == null) return '';
    var d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function renderRecentActivity() {
    var list = document.getElementById('la-activity-list');
    if (!list) return;
    var items = getActivityList();
    list.innerHTML = '';
    if (items.length === 0) {
      var li = document.createElement('li');
      li.className = 'la-activity-empty';
      li.textContent = 'No activity yet.';
      list.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'la-activity-item';
      var text = document.createElement('span');
      text.textContent = item.text || item.message || 'Activity';
      var time = document.createElement('span');
      time.className = 'la-activity-time';
      time.textContent = formatTime(item.timestamp);
      li.appendChild(text);
      li.appendChild(time);
      list.appendChild(li);
    });
  }

  function renderOutputPlaceholder() {
    var tbody = document.getElementById('la-output-tbody');
    var thead = document.getElementById('la-output-thead');
    var tfoot = document.getElementById('la-output-tfoot');
    var tableWrap = document.getElementById('la-table-wrap');
    if (tableWrap) tableWrap.classList.remove('la-thesis-table--two-group');
    if (thead) {
      thead.innerHTML =
        '<tr>' +
          '<th class="la-thesis-table__th la-thesis-table__th--particulars">Particulars</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--num">W.M.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--qd">Q.D.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--rank">Rank</th>' +
        '</tr>';
    }
    if (tfoot) {
      tfoot.innerHTML =
        '<tr class="la-thesis-table__footer-row">' +
          '<td class="la-thesis-table__footer-label"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-value">—</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-desc">—</strong></td>' +
          '<td class="la-thesis-table__footer-value"></td>' +
        '</tr>';
    }
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="la-output-empty">Select a table above to load indicators and values.</td></tr>';
    }
  }

  function clearInputs() {
    var titleEl = document.getElementById('la-table-title');
    if (titleEl) titleEl.value = '';
    var selectEl = document.getElementById('la-table-select');
    if (selectEl) selectEl.value = '';
    usingPredefinedTable = false;
    currentLikertConfig = null;
    currentTwoGroupData = null;
    laInterpTwoGroup = false;
    laInterpretationSh = '';
    laInterpretationT = '';
    computedData = { indicators: [], awm: 0, awmDesc: '', tableTitle: '', theme: '', scaleMapping: [] };
    renderOutputPlaceholder();
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    var interpTabs = document.getElementById('la-interp-tabs');
    if (interpTabs) interpTabs.hidden = true;
    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveBtn = document.getElementById('la-save-interpretation');
    var saveInputBtn = document.getElementById('la-save-input');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    if (copyBtn) copyBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (saveInputBtn) saveInputBtn.disabled = true;
    if (regenBtn) regenBtn.disabled = true;
    if (recomputeBtn) recomputeBtn.disabled = true;
    if (restoreBtn) restoreBtn.disabled = true;
    updateLiveStats(null, null);
    onInputChange();
  }

  function resetSession() {
    try {
      localStorage.removeItem(KEYS.likertTables);
      localStorage.removeItem(KEYS.tablesProcessed);
      localStorage.removeItem(KEYS.interpretationsGenerated);
      localStorage.removeItem(KEYS.reportsCreated);
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.likertDataSaved);
      localStorage.removeItem('tablesProcessed');
      localStorage.removeItem('respondentsEncoded');
      localStorage.removeItem('reportsCreated');
      localStorage.removeItem('profileDataSaved');
      localStorage.removeItem('summaryDataSaved');
      localStorage.removeItem('reportDataSaved');
      localStorage.removeItem('profileTables');
    } catch (e) {
      console.warn('Reset session: could not clear some keys', e);
    }
    closeResetModal();
    window.location.reload();
  }

  var resetModal = document.getElementById('la-reset-modal');
  var resetBackdrop = document.getElementById('la-reset-backdrop');
  var resetCancel = document.getElementById('la-reset-cancel');
  var resetConfirm = document.getElementById('la-reset-confirm');

  function openResetModal() {
    if (resetModal) {
      resetModal.removeAttribute('hidden');
      if (resetConfirm) resetConfirm.focus();
    }
  }
  function closeResetModal() {
    if (resetModal) resetModal.setAttribute('hidden', '');
  }

  var clearModal = document.getElementById('la-clear-modal');
  var clearBackdrop = document.getElementById('la-clear-backdrop');
  var clearCancel = document.getElementById('la-clear-cancel');
  var clearConfirm = document.getElementById('la-clear-confirm');

  function openClearModal() {
    if (clearModal) {
      clearModal.removeAttribute('hidden');
      if (clearConfirm) clearConfirm.focus();
    }
  }
  function closeClearModal() {
    if (clearModal) clearModal.setAttribute('hidden', '');
  }

  function init() {
    document.body.setAttribute('data-la-project', activeProjectId);
    var titleEl = document.getElementById('la-table-title');
    if (titleEl) titleEl.addEventListener('input', onInputChange);

    var projectSelect = document.getElementById('la-project-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', function () {
        activeProjectId = this.value || 'rp1';
        document.body.setAttribute('data-la-project', activeProjectId);
        activeTableId = '';
        activeTableData = null;
        currentLikertConfig = null;
        usingPredefinedTable = false;
        computedData = { indicators: [], awm: 0, awmDesc: '', tableTitle: '', theme: '', scaleMapping: getScaleMapping() };
        var selectEl = document.getElementById('la-table-select');
        if (selectEl) {
          selectEl.value = '';
          if (activeProjectId === 'rp2') {
            selectEl.value = 't10';
            loadRp2Table('t10');
          } else {
            if (titleEl) titleEl.value = '';
            renderOutputPlaceholder();
            var block = document.getElementById('la-interpretation-block');
            if (block) block.textContent = '';
            updateLiveStats(null, null);
          }
        }
        updateSelectedTableSummary();
      });
    }

    var selectEl = document.getElementById('la-table-select');
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        var id = this.value;
        if (!id) return;
        if (activeProjectId === 'rp2') {
          loadRp2Table(id);
        } else {
          loadLikertTable(id);
        }
        updateSelectedTableSummary();
      });
    }

    var implToggle = document.getElementById('la-include-implications');
    if (implToggle) {
      implToggle.addEventListener('change', function () {
        if (activeProjectId === 'rp2' && currentLikertConfig) {
          if (currentLikertConfig.type !== 'tTest' && (currentLikertConfig.rows || currentTwoGroupData)) {
            generateTwoGroupInterpretations(0, '');
            var block = document.getElementById('la-interpretation-block');
            if (block) block.textContent = laInterpretationSh;
          } else if (currentLikertConfig.type === 'tTest' && currentLikertConfig.prewritten) {
            var block = document.getElementById('la-interpretation-block');
            if (block) {
              var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
              var prewrittenText = (currentLikertConfig.prewritten.sh || '') + (currentLikertConfig.prewritten.t ? ' ' + currentLikertConfig.prewritten.t : '');
              if (this.checked && Utils && prewrittenText) {
                var impl = Utils.buildImplications('ttest');
                prewrittenText += ' ' + impl.first + ' ' + impl.second;
              }
              block.textContent = prewrittenText;
            }
          }
        } else if (activeProjectId === 'rp1' && computedData.indicators.length) {
          generateInterpretation();
        }
      });
    }

    var useLoadedCheckbox = document.getElementById('la-use-loaded-qd-rank');
    var qdAutoCheckbox = document.getElementById('la-qd-mode-auto');
    if (useLoadedCheckbox) {
      useLoadedCheckbox.addEventListener('change', function () {
        useLoadedQd = !!this.checked;
        if (usingPredefinedTable && activeProjectId === 'rp1') {
          recomputeFromPredefinedTable();
        }
      });
    }
    if (qdAutoCheckbox) {
      qdAutoCheckbox.addEventListener('change', function () {
        updateScaleSectionVisibility();
        if (usingPredefinedTable && activeProjectId === 'rp1') {
          recomputeFromPredefinedTable();
        }
      });
    }

    // Segmented control for Q.D. / Rank
    var qdToggle = document.getElementById('la-qd-toggle');
    if (qdToggle) {
      var qdButtons = qdToggle.querySelectorAll('.la-qd-toggle__btn');
      qdButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.getAttribute('data-qd-mode') || 'loaded';
          setQdMode(mode);
          qdButtons.forEach(function (b) {
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
        });
      });
    }

    for (var v = 5; v >= 1; v--) {
      var minEl = document.getElementById('la-scale-' + v + '-min');
      var maxEl = document.getElementById('la-scale-' + v + '-max');
      var labelEl = document.getElementById('la-scale-' + v + '-label');
      if (minEl) minEl.addEventListener('input', function () { updateScalePreview(); onInputChange(); });
      if (maxEl) maxEl.addEventListener('input', function () { updateScalePreview(); onInputChange(); });
      if (labelEl) labelEl.addEventListener('input', function () { updateScalePreview(); onInputChange(); });
    }

    var resetScaleBtn = document.getElementById('la-reset-scale');
    if (resetScaleBtn) resetScaleBtn.addEventListener('click', resetScale);
    var scaleToggleBtn = document.getElementById('la-scale-toggle');
    if (scaleToggleBtn) scaleToggleBtn.addEventListener('click', toggleScaleCollapse);
    var saveScaleBtn = document.getElementById('la-save-scale');
    if (saveScaleBtn) saveScaleBtn.addEventListener('click', saveScaleToStorage);
    var recomputeBtn = document.getElementById('la-recompute');
    if (recomputeBtn) {
      recomputeBtn.addEventListener('click', function () {
        if (usingPredefinedTable) {
          recomputeFromPredefinedTable();
        }
      });
    }
    var restoreBtn = document.getElementById('la-restore-original');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', function () {
        if (currentLikertConfig) {
          var id = currentLikertConfig.id;
          if (activeProjectId === 'rp2') {
            loadRp2Table(id);
          } else {
            loadLikertTable(id);
          }
          showToast('Original values restored.');
        }
      });
    }
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    if (regenBtn) regenBtn.addEventListener('click', regenerateInterpretation);
    var copyBtn = document.getElementById('la-copy-interpretation');
    if (copyBtn) copyBtn.addEventListener('click', copyInterpretation);
    var interpToggleBtn = document.getElementById('la-interpretation-toggle');
    if (interpToggleBtn) interpToggleBtn.addEventListener('click', toggleInterpretationExpand);
    var interpTabsEl = document.getElementById('la-interp-tabs');
    if (interpTabsEl) {
      interpTabsEl.querySelectorAll('[data-interp-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.getAttribute('data-interp-tab');
          interpTabsEl.querySelectorAll('.la-qd-toggle__btn').forEach(function (b) {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
          var block = document.getElementById('la-interpretation-block');
          if (block && laInterpTwoGroup) {
            block.textContent = tab === 'sh' ? laInterpretationSh : laInterpretationT;
          }
        });
      });
    }
    var saveInterpretationBtn = document.getElementById('la-save-interpretation');
    if (saveInterpretationBtn) saveInterpretationBtn.addEventListener('click', saveToReport);
    var saveInputBtn = document.getElementById('la-save-input');
    if (saveInputBtn) saveInputBtn.addEventListener('click', saveToReport);

    var clearInputsBtn = document.getElementById('la-clear-inputs');
    if (clearInputsBtn) clearInputsBtn.addEventListener('click', openClearModal);
    if (clearConfirm) clearConfirm.addEventListener('click', function () {
      clearInputs();
      closeClearModal();
    });
    if (clearCancel) clearCancel.addEventListener('click', closeClearModal);
    if (clearBackdrop) clearBackdrop.addEventListener('click', closeClearModal);

    var resetBtn = document.getElementById('la-btn-reset');
    var resetBtnMobile = document.getElementById('la-btn-reset-mobile');
    if (resetBtn) resetBtn.addEventListener('click', openResetModal);
    if (resetBtnMobile) resetBtnMobile.addEventListener('click', openResetModal);
    if (resetConfirm) resetConfirm.addEventListener('click', resetSession);
    if (resetCancel) resetCancel.addEventListener('click', closeResetModal);
    if (resetBackdrop) resetBackdrop.addEventListener('click', closeResetModal);
    if (resetModal) resetModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeResetModal();
    });
    if (clearModal) clearModal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeClearModal();
    });

    // Row density controls
    var densityButtons = document.querySelectorAll('[data-row-density]');
    if (densityButtons.length) {
      densityButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.getAttribute('data-row-density') || 'comfortable';
          setRowDensity(mode);
          densityButtons.forEach(function (b) {
            b.classList.remove('la-chip--active');
          });
          btn.classList.add('la-chip--active');
        });
      });
    }

    var hamburger = document.getElementById('la-hamburger');
    var dropdown = document.getElementById('la-nav-dropdown');
    if (hamburger && dropdown) {
      hamburger.addEventListener('click', function () {
        var isOpen = dropdown.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', isOpen);
      });
      dropdown.querySelectorAll('.la-nav-dropdown__link').forEach(function (link) {
        link.addEventListener('click', function () {
          dropdown.classList.remove('is-open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    loadScaleFromStorage();
    updateScalePreview();
    updateSessionProgress();
    renderRecentActivity();
    onInputChange();
    updateScaleSectionVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
