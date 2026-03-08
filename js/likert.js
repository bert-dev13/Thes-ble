/**
 * Thesis Interpretation Assistant — Likert Analyzer
 * Vanilla JS: manual table title, opening phrase, scale mapping, indicator rows.
 * Computes weighted mean, rank (ties = average-of-positions), qualitative description, AWM.
 * Generates formal academic interpretation paragraph.
 * localStorage: likertTables[], tablesProcessed, interpretationsGenerated, recentActivity.
 */

(function () {
  'use strict';

  var KEYS = {
    likertTables: 'likertTables',
    tablesProcessed: 'tablesProcessed',
    interpretationsGenerated: 'interpretationsGenerated',
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

  // Research Paper 1: Table-specific interpretation format (Tables 10–22)
  var RP1_LIKERT_INTERPRETATION_CONFIG = {
    t10: {
      id: 't10',
      title: 'Interpretation for Extent of Use of Cooperative Learning Strategies in Enhancing the Performance of Grade 5 Pupils in Mathematics',
      opener: 'Pertaining to the extent of use of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, ',
      openerAlternatives: [
        'Pertaining to the extent of use of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, ',
        'Regarding the extent of use of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, ',
        'As to the extent of use of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, '
      ],
      awmConstruct: 'the use of cooperative learning strategies',
      indicates: 'This indicates that cooperative learning strategies are consistently practiced in Mathematics instruction.',
      implies: 'This further implies that teachers actively integrate collaborative activities to enhance pupil engagement and learning outcomes.'
    },
    t11: {
      id: 't11',
      title: 'Interpretation for Extent of Effect of Cooperative Learning Strategies in Enhancing the Performance of Grade 5 Pupils in Mathematics',
      opener: 'In relation to the extent of effect of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, ',
      openerAlternatives: [
        'In relation to the extent of effect of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, ',
        'Regarding the extent of effect of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, ',
        'As to the extent of effect of cooperative learning strategies in enhancing the performance of Grade 5 pupils in Mathematics, '
      ],
      awmConstruct: 'the effect of cooperative learning strategies',
      indicates: 'This indicates that cooperative learning strategies positively influence pupils\' mathematical performance.',
      implies: 'This further implies that collaborative instructional approaches contribute significantly to improving pupils\' understanding of mathematical concepts.'
    },
    t12: {
      id: 't12',
      title: 'Interpretation for Extent of Realization of Mathematics 5 Most Essential Learning Competencies for the First Quarter',
      opener: 'Considering the extent of realization of Mathematics 5 most essential learning competencies through the use of cooperative learning strategies for the first quarter, ',
      openerAlternatives: [
        'Considering the extent of realization of Mathematics 5 most essential learning competencies through the use of cooperative learning strategies for the first quarter, ',
        'Regarding the extent of realization of Mathematics 5 most essential learning competencies for the first quarter, ',
        'As to the extent of realization of Mathematics 5 most essential learning competencies for the first quarter, '
      ],
      awmConstruct: 'the competencies',
      indicates: 'This indicates that pupils demonstrate strong mastery of the first-quarter mathematics competencies.',
      implies: 'This further implies that cooperative learning strategies support effective competency development among pupils.'
    },
    t13: {
      id: 't13',
      title: 'Interpretation for Second Quarter Competencies',
      opener: 'Across the extent of realization of Mathematics 5 most essential learning competencies for the second quarter, ',
      openerAlternatives: [
        'Across the extent of realization of Mathematics 5 most essential learning competencies for the second quarter, ',
        'Regarding the extent of realization of Mathematics 5 competencies for the second quarter, ',
        'As to the extent of realization of Mathematics 5 competencies for the second quarter, '
      ],
      awmConstruct: 'the second-quarter competencies',
      indicates: 'This indicates that pupils demonstrate a high level of mastery in the competencies during the second quarter.',
      implies: 'This further implies that cooperative learning strategies effectively support continuous mathematics learning progression.'
    },
    t14: {
      id: 't14',
      title: 'Interpretation for Third Quarter Competencies',
      opener: 'Focusing on the extent of realization of Mathematics 5 competencies during the third quarter, ',
      openerAlternatives: [
        'Focusing on the extent of realization of Mathematics 5 competencies during the third quarter, ',
        'Regarding the extent of realization of Mathematics 5 competencies during the third quarter, ',
        'As to the extent of realization of Mathematics 5 competencies during the third quarter, '
      ],
      awmConstruct: 'the third-quarter competencies',
      indicates: 'This indicates that pupils demonstrate strong proficiency in mathematical concepts introduced during the third quarter.',
      implies: 'This further implies that instructional strategies effectively support learners in mastering higher-level mathematical skills.'
    },
    t15: {
      id: 't15',
      title: 'Interpretation for Fourth Quarter Competencies',
      opener: 'Relative to the extent of realization of Mathematics 5 competencies during the fourth quarter, ',
      openerAlternatives: [
        'Relative to the extent of realization of Mathematics 5 competencies during the fourth quarter, ',
        'Regarding the extent of realization of Mathematics 5 competencies during the fourth quarter, ',
        'As to the extent of realization of Mathematics 5 competencies during the fourth quarter, '
      ],
      awmConstruct: 'the fourth-quarter competencies',
      indicates: 'This indicates that pupils maintain strong competence in mathematical skills during the final quarter.',
      implies: 'This further implies that the learning outcomes across the academic year are consistently achieved.'
    },
    t16: {
      id: 't16',
      title: 'Interpretation for Executive Summary of Competency Realization',
      opener: 'The executive summary of the extent of realization of Mathematics 5 most essential learning competencies shows that ',
      openerAlternatives: [
        'The executive summary of the extent of realization of Mathematics 5 most essential learning competencies shows that ',
        'The executive summary of the extent of realization of Mathematics 5 competencies indicates that ',
        'The executive summary of the extent of realization of Mathematics 5 competencies reveals that '
      ],
      isExecutiveSummary: true,
      indicates: 'This indicates that pupils consistently demonstrate mastery of the required mathematics competencies throughout the school year.',
      implies: 'This further implies that the instructional strategies implemented by teachers effectively support competency-based learning.'
    },
    t17: {
      id: 't17',
      title: 'Interpretation for Teacher-Related Challenges',
      opener: 'Concerning the challenges encountered in using cooperative learning strategies in terms of teacher-related factors, ',
      openerAlternatives: [
        'Concerning the challenges encountered in using cooperative learning strategies in terms of teacher-related factors, ',
        'Regarding the challenges encountered in terms of teacher-related factors, ',
        'As to the challenges encountered in terms of teacher-related factors, '
      ],
      awmConstruct: 'the challenges',
      indicates: 'This indicates that teachers experience notable difficulties in implementing cooperative learning strategies effectively.',
      implies: 'This further implies that professional development and instructional support are necessary to address these challenges.'
    },
    t18: {
      id: 't18',
      title: 'Interpretation for Time Management Challenges',
      opener: 'With reference to the challenges encountered in terms of time management, ',
      openerAlternatives: [
        'With reference to the challenges encountered in terms of time management, ',
        'Regarding the challenges encountered in terms of time management, ',
        'As to the challenges encountered in terms of time management, '
      ],
      awmConstruct: 'time management challenges',
      indicates: 'This indicates that cooperative learning activities demand considerable time for preparation and monitoring.',
      implies: 'This further implies that teachers must effectively organize instructional time to implement cooperative strategies successfully.'
    },
    t19: {
      id: 't19',
      title: 'Interpretation for Pupils\' Factors',
      opener: 'In relation to the challenges encountered in terms of pupils\' factors, ',
      openerAlternatives: [
        'In relation to the challenges encountered in terms of pupils\' factors, ',
        'Regarding the challenges encountered in terms of pupils\' factors, ',
        'As to the challenges encountered in terms of pupils\' factors, '
      ],
      awmConstruct: 'these challenges',
      indicates: 'This indicates that pupils\' behavioral and participation differences influence the effectiveness of cooperative learning.',
      implies: 'This further implies that teachers must employ effective classroom management and grouping strategies to maintain productive collaboration.'
    },
    t20: {
      id: 't20',
      title: 'Interpretation for Resource-Related Factors',
      opener: 'Pertaining to the challenges encountered in terms of resource-related factors, ',
      openerAlternatives: [
        'Pertaining to the challenges encountered in terms of resource-related factors, ',
        'Regarding the challenges encountered in terms of resource-related factors, ',
        'As to the challenges encountered in terms of resource-related factors, '
      ],
      awmConstruct: 'these challenges',
      indicates: 'This indicates that limitations in resources affect the implementation of cooperative learning strategies.',
      implies: 'This further implies that additional instructional materials and institutional support are needed to improve cooperative learning activities.'
    },
    t21: {
      id: 't21',
      title: 'Interpretation for Executive Summary of Challenges',
      opener: 'The executive summary of the challenges encountered by Mathematics 5 teachers in using cooperative learning strategies shows that ',
      openerAlternatives: [
        'The executive summary of the challenges encountered by Mathematics 5 teachers in using cooperative learning strategies shows that ',
        'The executive summary of the challenges encountered by Mathematics 5 teachers indicates that ',
        'The executive summary of the challenges encountered by Mathematics 5 teachers reveals that '
      ],
      isExecutiveSummary: true,
      indicates: 'This indicates that implementing cooperative learning strategies involves several practical difficulties.',
      implies: 'This further implies that targeted support and training programs are necessary to assist teachers in overcoming these challenges.'
    },
    t22: {
      id: 't22',
      title: 'Interpretation for Effectiveness of Coping Mechanisms',
      opener: 'As to the effectiveness of coping mechanisms used to address the challenges encountered in cooperative learning, ',
      openerAlternatives: [
        'As to the effectiveness of coping mechanisms used to address the challenges encountered in cooperative learning, ',
        'Regarding the effectiveness of coping mechanisms used to address the challenges in cooperative learning, ',
        'Concerning the effectiveness of coping mechanisms used to address the challenges in cooperative learning, '
      ],
      awmConstruct: 'the coping mechanisms',
      indicates: 'This indicates that teachers employ effective strategies to address challenges in cooperative learning.',
      implies: 'This further implies that these coping mechanisms contribute to improving instructional practices and classroom collaboration.'
    }
  };

  var currentLikertConfig = null;
  var usingPredefinedTable = false;
  var useLoadedQd = true;
  var laInterpretationSh = '';
  var laInterpretationT = '';
  var laInterpTwoGroup = false;
  var currentTwoGroupData = null;

  /**
   * Detect Likert table type from current data structure.
   * Uses ThesisTextGenerator.detectTableType when available.
   * Returns: 'ttest' | 'two-group-likert' | 'single-likert'
   */
  function getDetectedLikertTableType() {
    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var src = currentLikertConfig || (computedData && computedData.indicators && computedData.indicators.length
      ? { rows: computedData.indicators, indicators: computedData.indicators } : null);
    if (Gen && Gen.detectTableType && src) {
      return Gen.detectTableType(src, 'likert');
    }
    if (currentLikertConfig && currentLikertConfig.type === 'tTest') return 'ttest';
    if (currentTwoGroupData || (currentLikertConfig && currentLikertConfig.rows && currentLikertConfig.rows[0] && currentLikertConfig.rows[0].sh && currentLikertConfig.rows[0].t)) {
      return 'two-group-likert';
    }
    return 'single-likert';
  }

  // RP2 Likert interpretation config (Tables 10–20; T-test t21–t22 keep prewritten)
  var RP2_LIKERT_INTERPRETATION_CONFIG = {
    t10: {
      sectionTitle: 'Level of Abilities of Grade 3 Pupils in Science in Terms of Curiosity',
      headsOpener: 'Relative to the level of abilities of Grade 3 pupils in Science in terms of curiosity, ',
      headsOpenerAlternatives: [
        'Relative to the level of abilities of Grade 3 pupils in Science in terms of curiosity, ',
        'Regarding the level of abilities of Grade 3 pupils in Science in terms of curiosity, ',
        'As to the level of abilities of Grade 3 pupils in Science in terms of curiosity, '
      ],
      headsAwmConstruct: 'the pupils\' curiosity in Science 3',
      headsIndicates: 'pupils generally demonstrate a strong inclination to explore and question scientific ideas.',
      headsImplies: 'curiosity is evident in their participation and engagement in science learning activities.',
      teachersIndicates: 'teachers likewise perceive pupils as interested and engaged in scientific exploration.',
      teachersImplies: 'curiosity is a visible and consistent ability among Grade 3 pupils in Science.'
    },
    t11: {
      sectionTitle: 'Level of Abilities of Grade 3 Pupils in Science in Terms of Creativity',
      headsOpener: 'As to the level of abilities of Grade 3 pupils in Science in terms of creativity, ',
      headsOpenerAlternatives: [
        'As to the level of abilities of Grade 3 pupils in Science in terms of creativity, ',
        'Regarding the level of abilities of Grade 3 pupils in Science in terms of creativity, ',
        'In terms of the level of abilities of Grade 3 pupils in Science in terms of creativity, '
      ],
      headsAwmConstruct: 'the pupils\' creativity in Science 3',
      headsIndicates: 'pupils are able to express original and flexible thinking in science activities.',
      headsImplies: 'creativity is evident in the way pupils solve problems and present their scientific ideas.',
      teachersIndicates: 'pupils show creativity in carrying out science tasks and expressing their ideas.',
      teachersImplies: 'their science performance reflects originality and adaptability in learning situations.'
    },
    t12: {
      sectionTitle: 'Level of Abilities of Grade 3 Pupils in Science in Terms of Communication',
      headsOpener: 'About the level of abilities of Grade 3 pupils in Science in terms of communication, ',
      headsOpenerAlternatives: [
        'About the level of abilities of Grade 3 pupils in Science in terms of communication, ',
        'Regarding the level of abilities of Grade 3 pupils in Science in terms of communication, ',
        'As to the level of abilities of Grade 3 pupils in Science in terms of communication, '
      ],
      headsAwmConstruct: 'the pupils\' communication abilities in Science 3',
      headsIndicates: 'pupils demonstrate strong skills in expressing and sharing scientific ideas.',
      headsImplies: 'communication is one of their well-developed abilities in science learning.',
      teachersIndicates: 'pupils are generally capable of communicating scientific ideas clearly and appropriately.',
      teachersImplies: 'communication skills support their active participation in science activities and discussions.'
    },
    t13: {
      sectionTitle: 'Level of Abilities of Grade 3 Pupils in Science in Terms of Collaboration',
      headsOpener: 'Regarding the level of abilities of Grade 3 pupils in Science in terms of collaboration, ',
      headsOpenerAlternatives: [
        'Regarding the level of abilities of Grade 3 pupils in Science in terms of collaboration, ',
        'As to the level of abilities of Grade 3 pupils in Science in terms of collaboration, ',
        'In terms of the level of abilities of Grade 3 pupils in Science in terms of collaboration, '
      ],
      headsAwmConstruct: 'the pupils\' collaboration abilities in Science 3',
      headsIndicates: 'pupils work effectively with others in carrying out science tasks.',
      headsImplies: 'teamwork and shared responsibility are strongly evident in their learning behavior.',
      teachersIndicates: 'pupils consistently display cooperative behavior in science-related group work.',
      teachersImplies: 'collaborative learning is a strong aspect of their classroom performance.'
    },
    t14: {
      sectionTitle: 'Executive Summary of the Level of Abilities of Grade 3 Pupils in Science',
      headsOpener: 'The executive summary of the level of abilities of Grade 3 pupils in Science shows that ',
      headsOpenerAlternatives: [
        'The executive summary of the level of abilities of Grade 3 pupils in Science shows that ',
        'The executive summary of the level of abilities of Grade 3 pupils in Science indicates that ',
        'The executive summary of the level of abilities of Grade 3 pupils in Science reveals that '
      ],
      headsAwmConstruct: 'the pupils\' abilities in Science',
      isExecutiveSummary: true,
      headsIndicates: 'pupils demonstrate strong overall abilities across the measured domains.',
      headsImplies: 'their science performance is supported by well-developed cognitive and social skills.',
      teachersIndicates: 'teachers also perceive pupils as capable across major science-related abilities.',
      teachersImplies: 'the learners possess a solid foundation for effective science learning.'
    },
    t15: {
      sectionTitle: 'Extent of Constraints of Grade 3 Pupils in Science in Terms of Comprehension of Concepts',
      headsOpener: 'In relation to the extent of constraints of Grade 3 pupils in Science in terms of comprehension of concepts, ',
      headsOpenerAlternatives: [
        'In relation to the extent of constraints of Grade 3 pupils in Science in terms of comprehension of concepts, ',
        'Regarding the extent of constraints of Grade 3 pupils in Science in terms of comprehension of concepts, ',
        'As to the extent of constraints of Grade 3 pupils in Science in terms of comprehension of concepts, '
      ],
      headsAwmConstruct: 'pupils\' comprehension-related constraints in Science 3',
      headsIndicates: 'pupils experience noticeable difficulty in understanding and applying science concepts.',
      headsImplies: 'conceptual comprehension remains an area that requires instructional support.',
      teachersIndicates: 'teachers observe these comprehension difficulties at a less severe level.',
      teachersImplies: 'although such constraints are present, they are generally manageable in classroom instruction.'
    },
    t16: {
      sectionTitle: 'Extent of Constraints of Grade 3 Pupils in Science in Terms of Readiness for Inquiry-Based Tasks',
      headsOpener: 'With respect to the extent of constraints of Grade 3 pupils in Science in terms of readiness for inquiry-based tasks, ',
      headsOpenerAlternatives: [
        'With respect to the extent of constraints of Grade 3 pupils in Science in terms of readiness for inquiry-based tasks, ',
        'Regarding the extent of constraints of Grade 3 pupils in Science in terms of readiness for inquiry-based tasks, ',
        'As to the extent of constraints of Grade 3 pupils in Science in terms of readiness for inquiry-based tasks, '
      ],
      headsAwmConstruct: 'readiness-related constraints',
      headsIndicates: 'pupils encounter difficulties in carrying out inquiry-based science tasks independently.',
      headsImplies: 'inquiry readiness still needs to be strengthened through guided practice.',
      teachersIndicates: 'teachers also observe notable difficulty among pupils in inquiry-based activities.',
      teachersImplies: 'learners need continuous support in developing investigative and reflective science skills.'
    },
    t17: {
      sectionTitle: 'Extent of Constraints of Grade 3 Pupils in Science in Terms of Availability of Resources',
      headsOpener: 'Concerning the extent of constraints of Grade 3 pupils in Science in terms of availability of resources, ',
      headsOpenerAlternatives: [
        'Concerning the extent of constraints of Grade 3 pupils in Science in terms of availability of resources, ',
        'Regarding the extent of constraints of Grade 3 pupils in Science in terms of availability of resources, ',
        'As to the extent of constraints of Grade 3 pupils in Science in terms of availability of resources, '
      ],
      headsAwmConstruct: 'resource-related constraints',
      headsIndicates: 'limited materials and facilities affect pupils\' science learning experiences.',
      headsImplies: 'improving access to resources is important for effective science instruction.',
      teachersIndicates: 'teachers also recognize the effect of resource limitations on science learning.',
      teachersImplies: 'adequate materials and facilities are necessary to support more effective classroom and home-based science activities.'
    },
    t18: {
      sectionTitle: 'Extent of Constraints of Grade 3 Pupils in Science in Terms of Support from the Learning Environment',
      headsOpener: 'Pertaining to the extent of constraints of Grade 3 pupils in Science in terms of support from the learning environment, ',
      headsOpenerAlternatives: [
        'Pertaining to the extent of constraints of Grade 3 pupils in Science in terms of support from the learning environment, ',
        'Regarding the extent of constraints of Grade 3 pupils in Science in terms of support from the learning environment, ',
        'As to the extent of constraints of Grade 3 pupils in Science in terms of support from the learning environment, '
      ],
      headsAwmConstruct: 'learning-environment constraints',
      headsIndicates: 'the surrounding learning environment influences the pupils\' science performance.',
      headsImplies: 'stronger classroom, school, and family support is needed to improve science learning conditions.',
      teachersIndicates: 'teachers perceive these environmental constraints at a lower level than school heads do.',
      teachersImplies: 'although such factors are present, they are not seen as the most serious barriers to science learning.'
    },
    t19: {
      sectionTitle: 'Executive Summary of the Extent of Constraints of Grade 3 Pupils in Science',
      headsOpener: 'The executive summary of the extent of constraints of Grade 3 pupils in Science shows that ',
      headsOpenerAlternatives: [
        'The executive summary of the extent of constraints of Grade 3 pupils in Science shows that ',
        'The executive summary of the extent of constraints of Grade 3 pupils in Science indicates that ',
        'The executive summary of the extent of constraints of Grade 3 pupils in Science reveals that '
      ],
      headsAwmConstruct: 'the constraints of Grade 3 pupils in Science',
      isExecutiveSummary: true,
      headsIndicates: 'school heads perceive several notable barriers affecting pupils\' science learning.',
      headsImplies: 'these constraints require focused attention to improve pupil performance.',
      teachersIndicates: 'teachers recognize the presence of constraints but at a generally lower degree.',
      teachersImplies: 'from the teachers\' perspective, these challenges are present yet still manageable within instruction.'
    },
    t20: {
      sectionTitle: 'Extent of the Challenges Encountered by Teachers in Science 3 Instruction',
      headsOpener: 'The extent of the challenges encountered by teachers in Science 3 instruction, as assessed by school head respondents, includes ',
      headsOpenerAlternatives: [
        'The extent of the challenges encountered by teachers in Science 3 instruction, as assessed by school head respondents, includes ',
        'The extent of the challenges encountered by teachers in Science 3 instruction, as reported by school head respondents, includes ',
        'The extent of the challenges encountered by teachers in Science 3 instruction, as indicated by school head respondents, includes '
      ],
      headsAwmConstruct: 'these instructional challenges',
      headsRated: false,
      teachersOpener: 'Meanwhile, teacher respondents rated ',
      teachersOpenerAlternatives: [
        'Meanwhile, teacher respondents rated ', 'Similarly, teacher respondents rated ', 'For their part, teacher respondents rated '
      ],
      headsIndicates: 'teachers encounter substantial demands in delivering Science 3 instruction effectively.',
      headsImplies: 'instructional support and resource enhancement are necessary to address these persistent challenges.',
      teachersIndicates: 'teachers themselves acknowledge the significant difficulties they encounter in Science 3 instruction.',
      teachersImplies: 'strengthening support systems and teaching resources is essential for more effective classroom implementation.'
    }
  };

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
        sh: 'Relative to the level of abilities of Grade 3 pupils in Science in terms of curiosity, school head respondents rated all indicators as High, led by "Explore new science concepts beyond the lesson" and "Pay attention during science demonstrations," each with a weighted mean of 4.20. This was followed by "Show interest in discovering how things work," "Express excitement when performing experiments," and "Connect classroom concepts to real-life situations," each with a weighted mean of 4.18. The remaining indicators were also rated High, with weighted means ranging from 3.98 to 4.13. The average weighted mean of 4.13 (High) indicates that pupils demonstrate a consistently high level of curiosity as assessed by the school heads.',
        t: 'Meanwhile, teacher respondents rated "Pay attention during science demonstrations" (4.33) and "Show interest in discovering how things work" (4.28) as Very High, while all other indicators were rated High, with weighted means ranging from 3.95 to 4.18. The average weighted mean of 4.13 (High) denotes that teachers likewise perceive the pupils to possess a high level of curiosity in Science 3.'
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
        sh: 'As to the level of abilities of Grade 3 pupils in Science in terms of creativity, school head respondents rated all indicators as High, with "Present science projects imaginatively" obtaining the highest weighted mean of 4.23, followed by "Propose original ideas when solving science problems" (4.20) and "Use materials inventively during hands-on activities" (4.15). The remaining indicators were also assessed as High, with weighted means ranging from 3.95 to 4.13. The average weighted mean of 4.11 (High) indicates that school heads perceive the pupils to consistently demonstrate strong creative abilities in Science 3.',
        t: 'Meanwhile, teacher respondents rated "Present science projects imaginatively" as Very High with a weighted mean of 4.25. All other indicators were assessed as High, led by "Adapt ideas when first attempts do not work" (4.20) and followed by weighted means ranging from 3.75 to 4.15. The average weighted mean of 4.06 (High) denotes that teachers likewise perceive the pupils to exhibit a generally high level of creativity in Science 3.'
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
        sh: 'Regarding the level of abilities of Grade 3 pupils in Science in terms of communication, school head respondents rated most indicators as Very High, led by "Use drawings or diagrams to communicate ideas" with a weighted mean of 4.48, followed by "Ask clarifying questions to understand others’ explanations" (4.43) and "Present science projects confidently to classmates" (4.40). The remaining indicators were also rated highly, with only "Use appropriate scientific vocabulary when speaking" (4.15) and "Summarize experimental results effectively" (4.13) interpreted as High. The average weighted mean of 4.29 (Very High) indicates that school heads perceive pupils to possess very strong communication abilities in Science 3.',
        t: 'Meanwhile, teacher respondents assessed all indicators as High, led by "Use drawings or diagrams to communicate ideas" (4.18) and "Present science projects confidently to classmates" (4.13). The rest of the indicators were also rated High, with weighted means ranging from 3.78 to 4.10. The average weighted mean of 3.99 (High) denotes that teachers perceive pupils to demonstrate generally strong communication abilities in Science 3.'
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
        sh: 'In terms of the level of abilities of Grade 3 pupils in Science in terms of collaboration, school head respondents rated all indicators as Very High, led by "Help peers who are struggling with tasks" and "Divide tasks efficiently during science projects," each with a weighted mean of 4.53. This was followed by "Work together to solve science problems" (4.50) and "Contribute ideas during group discussions" and "Encourage participation from all group members," each with 4.48. The remaining indicators were likewise assessed as Very High, with weighted means ranging from 4.33 to 4.45. The average weighted mean of 4.45 (Very High) indicates that school heads perceive pupils to demonstrate very strong collaborative abilities in Science 3.',
        t: 'Meanwhile, teacher respondents also rated most indicators as Very High, led by "Encourage participation from all group members" (4.35) and "Work together to solve science problems" and "Divide tasks efficiently during science projects," each with 4.33. The remaining indicators were rated Very High or High, with weighted means ranging from 4.10 to 4.30. The average weighted mean of 4.25 (Very High) indicates that teachers consistently perceive pupils’ collaborative abilities in Science 3 as highly developed.'
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
        sh: 'The executive summary of the level of abilities of Grade 3 pupils in Science shows that school heads rated Collaboration (4.45) and Communication (4.29) as Very High, while Curiosity (4.13) and Creativity (4.11) were rated High. The overall average weighted mean of 4.25 (Very High) indicates that, overall, school heads perceive pupils’ abilities in Science as very high.',
        t: 'Meanwhile, teacher respondents rated Collaboration as Very High (4.25), while Curiosity (4.13), Creativity (4.06), and Communication (3.99) were assessed as High. The overall average weighted mean of 4.11 (High) indicates that teachers generally perceive pupils’ abilities in Science as high.'
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
        sh: 'In relation to the extent of constraints of Grade 3 pupils in Science in terms of comprehension of concepts, school head respondents assessed several constraints as Moderately Serious, led by "Struggle to understand abstract science concepts" with a weighted mean of 3.08, followed by "Require repeated explanations to grasp concepts" (2.80). The remaining constraints were generally rated Moderately Serious or Slightly Serious, with weighted means ranging from 2.45 to 2.73. The average weighted mean of 2.70 (Moderately Serious) indicates that school heads perceive comprehension-related constraints to be moderately serious overall.',
        t: 'Meanwhile, teacher respondents rated only "Struggle to understand abstract science concepts" as Moderately Serious (2.65), while all remaining constraints were assessed as Slightly Serious, with weighted means ranging from 2.00 to 2.40. The average weighted mean of 2.24 (Slightly Serious) denotes that teachers perceive comprehension-related constraints as present but only slightly serious.'
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
        sh: 'With respect to the extent of constraints of Grade 3 pupils in Science in terms of readiness for inquiry-based tasks, school head respondents assessed all indicators as Moderately Serious, led by "Show discomfort making predictions before experiments" and "Find it challenging to draw conclusions from observations," each with a weighted mean of 3.38. This was followed by "Struggle to design simple investigations" (3.28) and other indicators ranging from 2.95 to 3.18. The average weighted mean of 3.15 (Moderately Serious) indicates that school heads view readiness-related constraints as moderately serious.',
        t: 'Meanwhile, teacher respondents rated as Moderately Serious the constraints "Show discomfort making predictions before experiments" (2.93), "Find it challenging to draw conclusions from observations" (2.83), "Struggle to design simple investigations" (2.78), and "Need frequent prompts to reflect on learning" (2.68). The remaining indicators were assessed as Slightly Serious, with weighted means ranging from 2.40 to 2.60. The average weighted mean of 2.61 (Moderately Serious) indicates that teachers also view readiness-related constraints as moderately serious.'
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
        sh: 'Concerning the extent of constraints of Grade 3 pupils in Science in terms of availability of resources, school head respondents assessed all indicators as Moderately Serious, led by "Cannot perform hands-on activities due to resource shortages" and "Cannot practice experiments at home due to lack of materials," each with a weighted mean of 3.35. The remaining indicators were likewise rated Moderately Serious, with weighted means ranging from 2.98 to 3.18. The average weighted mean of 3.13 (Moderately Serious) indicates that school heads view resource-related constraints as moderately serious.',
        t: 'Meanwhile, teacher respondents assessed as Moderately Serious the constraints "Cannot perform hands-on activities due to resource shortages" (3.05), "Cannot practice experiments at home due to lack of materials" (2.98), and "Experience limited laboratory space" (2.80), along with several indicators at 2.65–2.70. The remaining indicators were rated Slightly Serious, with weighted means of 2.45–2.48. The average weighted mean of 2.67 (Moderately Serious) indicates that teachers also view resource-related constraints as moderately serious.'
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
        sh: 'Pertaining to the extent of constraints of Grade 3 pupils in Science in terms of support from the learning environment, school head respondents assessed all indicators as Moderately Serious, led by "Experience distractions in the classroom that affect learning" with a weighted mean of 3.18, followed by "Receive minimal encouragement from peers during science activities" (3.10). The remaining indicators were also rated Moderately Serious, with weighted means ranging from 2.78 to 3.08. The average weighted mean of 2.99 (Moderately Serious) indicates that school heads view learning-environment constraints as moderately serious.',
        t: 'Meanwhile, teacher respondents assessed as Moderately Serious only "Experience distractions in the classroom that affect learning" (2.75), while the rest were rated Slightly Serious, with weighted means ranging from 2.10 to 2.60. The average weighted mean of 2.42 (Slightly Serious) indicates that teachers view learning-environment constraints as slightly serious overall.'
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
        sh: 'The executive summary of the extent of constraints of Grade 3 pupils in Science shows that school heads assessed all domains as Moderately Serious, led by Readiness for Inquiry-Based Tasks (3.15), followed by Availability of Resources (3.13), Comprehension of Concepts (2.70), and Support from the Learning Environment (2.99). The overall average weighted mean of 2.99 (Moderately Serious) indicates that school heads view the constraints experienced by pupils in Science as moderately serious.',
        t: 'Meanwhile, teacher respondents assessed Readiness for Inquiry-Based Tasks (2.61) and Availability of Resources (2.67) as Moderately Serious, while Support from the Learning Environment (2.42) and Comprehension of Concepts (2.24) were assessed as Slightly Serious. The overall average weighted mean of 2.48 (Slightly Serious) indicates that teachers perceive pupils’ constraints in Science as slightly serious overall.'
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
        sh: 'The extent of the challenges encountered by teachers in Science 3 instruction shows that school head respondents assessed all indicators as Serious, led by "Motivate unengaged or distracted learners" with a weighted mean of 4.13, followed by "Implement hands-on or experimental tasks effectively" and "Integrate technology and other instructional tools in science teaching," each with 4.10. The remaining indicators were likewise rated Serious, with weighted means ranging from 3.88 to 4.05. The average weighted mean of 4.01 (Serious) indicates that school heads view instructional challenges in Science 3 as serious.',
        t: 'Meanwhile, teacher respondents also assessed all indicators as Serious, led by "Motivate unengaged or distracted learners" (3.93) and followed by "Implement hands-on or experimental tasks effectively" and "Integrate technology and other instructional tools in science teaching," each with 3.90. The remaining indicators were similarly rated Serious, with weighted means ranging from 3.50 to 3.75. The average weighted mean of 3.72 (Serious) indicates that teachers experience these challenges in Science 3 instruction to a serious extent.'
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
        sh: 'The t-test results show a significant difference between the perceptions of school heads and teachers regarding the constraints of learners in Science 3. The computed t-value exceeded the t-critical value and the null hypothesis was rejected, indicating that the perceptions of the two groups differ significantly. This implies that school heads tend to view learners’ constraints as more substantial, suggesting that supervisory perspectives may heighten sensitivity to learners’ difficulties across classrooms.',
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
        sh: 'The t-test results reveal a significant difference between the perceptions of school heads and teachers regarding the challenges encountered in Science 3 instruction. The computed t-value exceeded the t-critical value and the null hypothesis was rejected, indicating that the two groups differ significantly in their assessment. This implies that school heads recognize a greater extent of instructional challenges, reflecting a broader administrative view of instructional demands, resource limitations, and curriculum expectations.',
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

  function copyScaleMapping() {
    var mapping = getScaleMapping();
    var header = 'Scale\tRange From\tRange To\tQualitative Description';
    var rows = mapping.map(function (m) {
      var min = m.min != null ? String(m.min) : '';
      var max = m.max != null ? String(m.max) : '';
      return m.scaleValue + '\t' + min + '\t' + max + '\t' + (m.label || '');
    });
    var text = header + '\n' + rows.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('Scale mapping copied to clipboard.');
      }).catch(function () {
        showToast('Copy failed.', true);
      });
    } else {
      showToast('Clipboard not available.', true);
    }
  }

  function applyPastedScaleData(rows) {
    if (!rows || !rows.length) return false;
    rows.forEach(function (r) {
      var minEl = document.getElementById('la-scale-' + r.scaleValue + '-min');
      var maxEl = document.getElementById('la-scale-' + r.scaleValue + '-max');
      var labelEl = document.getElementById('la-scale-' + r.scaleValue + '-label');
      if (minEl) minEl.value = r.min != null ? r.min : '';
      if (maxEl) maxEl.value = r.max != null ? r.max : '';
      if (labelEl) labelEl.value = r.label || '';
    });
    updateScalePreview();
    onInputChange();
    return true;
  }

  function parseScalePasteData(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return [];
    var rows = [];
    var header = lines[0].toLowerCase();
    var startIdx = (header.indexOf('scale') >= 0 || header.indexOf('range') >= 0) ? 1 : 0;
    for (var i = startIdx; i < lines.length; i++) {
      var parts = lines[i].split(/\t/).map(function (p) { return p.trim(); });
      if (parts.length >= 1) {
        var scaleVal = parseInt(parts[0], 10);
        var minVal = null;
        var maxVal = null;
        var labelVal = '';
        if (parts.length >= 4) {
          minVal = parts[1] !== '' ? parseFloat(parts[1]) : null;
          maxVal = parts[2] !== '' ? parseFloat(parts[2]) : null;
          labelVal = parts[3] || '';
        } else if (parts.length === 3) {
          var rangeStr = parts[1];
          var labelStr = parts[2];
          var rangeNums = rangeStr.match(/[\d.]+/g);
          if (rangeNums && rangeNums.length >= 2) {
            minVal = parseFloat(rangeNums[0]);
            maxVal = parseFloat(rangeNums[1]);
            labelVal = labelStr || '';
          } else {
            minVal = rangeStr !== '' ? parseFloat(rangeStr) : null;
            maxVal = null;
            labelVal = labelStr || '';
          }
        } else if (parts.length === 2) {
          minVal = parts[1] !== '' ? parseFloat(parts[1]) : null;
          labelVal = '';
        }
        if (scaleVal >= 1 && scaleVal <= 5 && !isNaN(scaleVal)) {
          rows.push({ scaleValue: scaleVal, min: isNaN(minVal) ? null : minVal, max: isNaN(maxVal) ? null : maxVal, label: labelVal });
        }
      }
    }
    return rows;
  }

  function handleScalePaste(e) {
    var clipboardData = e.clipboardData;
    if (!clipboardData) return;
    var html = clipboardData.getData('text/html');
    var plain = clipboardData.getData('text/plain');
    var text = '';
    if (html && html.indexOf('<table') >= 0) {
      var parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
      if (parser) {
        var doc = parser.parseFromString(html, 'text/html');
        var table = doc.querySelector('table');
        if (table) {
          var trs = table.querySelectorAll('tr');
          var lines = [];
          trs.forEach(function (tr) {
            var cells = tr.querySelectorAll('td, th');
            var vals = [];
            cells.forEach(function (c) { vals.push((c.textContent || '').trim()); });
            if (vals.some(function (v) { return v; })) lines.push(vals.join('\t'));
          });
          text = lines.join('\n');
        }
      }
    }
    if (!text) text = plain;
    if (!text || !text.trim()) return;
    e.preventDefault();
    var rows = parseScalePasteData(text);
    var errEl = document.getElementById('la-scale-paste-error');
    var pasteZone = document.getElementById('la-scale-paste-zone');
    if (!rows.length) {
      if (errEl) errEl.textContent = 'No valid scale rows found. Expect: Scale, Range From, Range To, Qualitative Description (tab-separated).';
      return;
    }
    if (errEl) errEl.textContent = '';
    applyPastedScaleData(rows);
    if (pasteZone) {
      pasteZone.textContent = 'Paste here (Ctrl + V)';
      pasteZone.classList.remove('la-paste-zone--has-content');
    }
    showToast('Scale mapping pasted. Rows and columns detected automatically.');
  }

  function pasteScaleMapping() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      showToast('Clipboard not available.', true);
      return;
    }
    navigator.clipboard.readText().then(function (text) {
      var rows = parseScalePasteData(text);
      if (!rows.length) {
        showToast('No valid scale rows found. Copy from Scale Mapping first, or use tab-separated: Scale, Range From, Range To, Label', true);
        return;
      }
      applyPastedScaleData(rows);
      showToast('Scale mapping pasted.');
    }).catch(function () {
      showToast('Paste failed.', true);
    });
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
      pill.textContent = 'Manual table';
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
  function renderPredefinedTableRows(config, opts) {
    opts = opts || {};
    var showComputed = opts.showComputed === true;
    var tbody = document.getElementById('la-output-tbody');
    var thead = document.getElementById('la-output-thead');
    var tfoot = document.getElementById('la-output-tfoot');
    var tableWrap = document.getElementById('la-table-wrap');
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    var saveTableBtn = document.getElementById('la-save-table');
    if (!tbody || !config) return;

    if (tableWrap) tableWrap.classList.remove('la-thesis-table--two-group');
    if (thead) {
      thead.innerHTML =
        '<tr>' +
          '<th class="la-thesis-table__th la-thesis-table__th--no" scope="col">No.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--particulars" scope="col">Particulars</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--num" scope="col" title="Weighted Mean">W.M.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--qd" scope="col" title="Qualitative Description">Q.D.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--rank" scope="col">Rank</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--action" scope="col">Remove</th>' +
        '</tr>';
    }
    var awmStr = showComputed && config.awm != null ? config.awm.toFixed(2) : '—';
    var awmDescStr = showComputed && (config.awmDesc != null && config.awmDesc !== '') ? config.awmDesc : '—';
    if (tfoot) {
      tfoot.innerHTML =
        '<tr class="la-thesis-table__footer-row">' +
          '<td class="la-thesis-table__footer-value"></td>' +
          '<td class="la-thesis-table__footer-label"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-value">' + awmStr + '</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-desc">' + escapeHtml(awmDescStr) + '</strong></td>' +
          '<td class="la-thesis-table__footer-value"></td>' +
          '<td class="la-thesis-table__footer-value"></td>' +
        '</tr>';
    }

    tbody.innerHTML = '';
    config.rows.forEach(function (row, idx) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-la-row-index', String(idx));
      var indVal = (row.indicator != null ? String(row.indicator) : '');
      var indSafe = escapeHtml(indVal);
      var qdVal = showComputed && row.qd ? escapeHtml(row.qd) : '';
      var rankVal = showComputed && row.rank != null ? (row.rank % 1 === 0 ? row.rank : row.rank.toFixed(1)) : '—';
      tr.innerHTML =
        '<td class="la-thesis-table__td la-thesis-table__td--no">' + (idx + 1) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--indicator"><textarea class="la-thesis-input la-thesis-input--indicator" data-la-indicator placeholder="Indicator" rows="2">' + indSafe + '</textarea></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-wm value="' + row.wm.toFixed(2) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-qd value="' + qdVal + '" placeholder="Q.D."></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-rank>' + rankVal + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--action"><button type="button" class="la-row-remove" aria-label="Remove row" data-la-remove>×</button></td>';
      tbody.appendChild(tr);
      var removeBtn = tr.querySelector('[data-la-remove]');
      if (removeBtn) removeBtn.addEventListener('click', function () { removeLikertOutputRow(tr); });
    });

    if (recomputeBtn) recomputeBtn.disabled = false;
    if (restoreBtn) restoreBtn.disabled = false;
    if (saveTableBtn) saveTableBtn.disabled = !showComputed;
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

    renderPredefinedTableRows(currentLikertConfig, { showComputed: false });
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    updateLiveStats(null, null);

    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveTableBtn = document.getElementById('la-save-table');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = true;
    if (saveTableBtn) saveTableBtn.disabled = true;
    if (regenBtn) regenBtn.disabled = true;

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
        '<th class="la-thesis-table__th la-thesis-table__th--no" scope="col">No.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--particulars" scope="col">Particulars</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--num" scope="col">t-value</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--qd" scope="col">t-critical</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--rank" scope="col">p-value</th>' +
        '<th class="la-thesis-table__th" scope="col">Decision</th>' +
        '<th class="la-thesis-table__th" scope="col">Description</th>' +
      '</tr>';

    tbody.innerHTML = '';
    (config.rows || []).forEach(function (row, idx) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="la-thesis-table__td la-thesis-table__td--no">' + (idx + 1) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--indicator">' + escapeHtml(row.label) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num">' + escapeHtml(String(row.tValue || '')) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd">' + escapeHtml(String(row.tCritical || '')) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank">' + escapeHtml(String(row.pValue || '')) + '</td>' +
        '<td class="la-thesis-table__td">' + escapeHtml(String(row.decision || '')) + '</td>' +
        '<td class="la-thesis-table__td">' + escapeHtml(String(row.description || '')) + '</td>';
      tbody.appendChild(tr);
    });

    tfoot.innerHTML =
      '<tr class="la-thesis-table__footer-row">' +
        '<td colspan="7" class="la-thesis-table__footer-label"></td>' +
      '</tr>';
  }

  // ---------- RP2 two-group weighted table rendering ----------
  function renderTwoGroupWeighted(config, opts) {
    opts = opts || {};
    var showComputed = opts.showComputed === true;
    var thead = document.getElementById('la-output-thead');
    var tbody = document.getElementById('la-output-tbody');
    var tfoot = document.getElementById('la-output-tfoot');
    var tableWrap = document.getElementById('la-table-wrap');
    if (!thead || !tbody || !tfoot || !config) return;

    if (tableWrap) tableWrap.classList.add('la-thesis-table--two-group');

    thead.innerHTML =
      '<tr class="la-thesis-table__group-row">' +
        '<th rowspan="2" class="la-thesis-table__th la-thesis-table__th--no" scope="col">No.</th>' +
        '<th rowspan="2" class="la-thesis-table__th la-thesis-table__th--particulars" scope="col">Particulars</th>' +
        '<th colspan="3" class="la-thesis-table__th la-thesis-table__th--group" scope="colgroup">School Heads</th>' +
        '<th colspan="3" class="la-thesis-table__th la-thesis-table__th--group" scope="colgroup">Teachers</th>' +
        '<th rowspan="2" class="la-thesis-table__th la-thesis-table__th--action" scope="col">Remove</th>' +
      '</tr>' +
      '<tr class="la-thesis-table__subhead-row">' +
        '<th class="la-thesis-table__th la-thesis-table__th--num" scope="col" title="Weighted Mean">W.M.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--qd" scope="col" title="Qualitative Description">Q.D.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--rank" scope="col">Rank</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--num" scope="col" title="Weighted Mean">W.M.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--qd" scope="col" title="Qualitative Description">Q.D.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--rank" scope="col">Rank</th>' +
      '</tr>';

    tbody.innerHTML = '';
    config.rows.forEach(function (row, idx) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-la-row-index', String(idx));
      var indVal = (row.indicator != null ? String(row.indicator) : '');
      var indSafe = escapeHtml(indVal);
      var shQdVal = showComputed && row.sh.qd ? escapeHtml(row.sh.qd) : '';
      var tQdVal = showComputed && row.t.qd ? escapeHtml(row.t.qd) : '';
      var shRankVal = showComputed && row.sh.rank != null ? (row.sh.rank % 1 === 0 ? row.sh.rank : row.sh.rank.toFixed(1)) : '—';
      var tRankVal = showComputed && row.t.rank != null ? (row.t.rank % 1 === 0 ? row.t.rank : row.t.rank.toFixed(1)) : '—';
      tr.innerHTML =
        '<td class="la-thesis-table__td la-thesis-table__td--no">' + (idx + 1) + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--indicator"><textarea class="la-thesis-input la-thesis-input--indicator" data-la-indicator placeholder="Indicator" rows="2">' + indSafe + '</textarea></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-sh-wm value="' + row.sh.wm.toFixed(2) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-sh-qd value="' + shQdVal + '" placeholder="Q.D."></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-sh-rank>' + shRankVal + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-t-wm value="' + row.t.wm.toFixed(2) + '"></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-t-qd value="' + tQdVal + '" placeholder="Q.D."></td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-t-rank>' + tRankVal + '</td>' +
        '<td class="la-thesis-table__td la-thesis-table__td--action"><button type="button" class="la-row-remove" aria-label="Remove row" data-la-remove>×</button></td>';
      tbody.appendChild(tr);
      var removeBtn = tr.querySelector('[data-la-remove]');
      if (removeBtn) removeBtn.addEventListener('click', function () { removeLikertOutputRow(tr); });
    });

    var awmShVal = showComputed && config.awm && config.awm.sh ? config.awm.sh.value.toFixed(2) : '—';
    var awmShDesc = showComputed && config.awm && config.awm.sh ? escapeHtml(config.awm.sh.qd) : '—';
    var awmTVal = showComputed && config.awm && config.awm.t ? config.awm.t.value.toFixed(2) : '—';
    var awmTDesc = showComputed && config.awm && config.awm.t ? escapeHtml(config.awm.t.qd) : '—';
    tfoot.innerHTML =
      '<tr class="la-thesis-table__footer-row">' +
        '<td class="la-thesis-table__footer-value"></td>' +
        '<td class="la-thesis-table__footer-label"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-sh-value">' + awmShVal + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-sh-desc">' + awmShDesc + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-t-value">' + awmTVal + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-t-desc">' + awmTDesc + '</strong></td>' +
        '<td class="la-thesis-table__footer-value"></td>' +
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
      renderTwoGroupWeighted(currentLikertConfig, { showComputed: false });
    }

    computedData = {
      indicators: [],
      awm: 0,
      awmDesc: '',
      tableTitle: config.title,
      theme: '',
      scaleMapping: getScaleMapping()
    };

    var block = document.getElementById('la-interpretation-block');
    laInterpTwoGroup = false;
    if (block) {
      if (config.type === 'tTest') {
        var hasTTestData = config.rows && config.rows.some(function (r) {
          var t = r.tValue != null ? String(r.tValue).trim() : '';
          return t !== '';
        });
        var GenLoad = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
        if (GenLoad && GenLoad.generateTTestInterpretation && hasTTestData) {
          var implElLoad = document.getElementById('la-include-implications');
          var includeImplicationsLoad = implElLoad && implElLoad.checked;
          block.textContent = GenLoad.generateTTestInterpretation(config, {
            tableTitle: config.title,
            includeImplications: includeImplicationsLoad
          });
        } else if (config.prewritten && !hasTTestData) {
          var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
          var includeImplications = true;
          var implEl = document.getElementById('la-include-implications');
          if (implEl) includeImplications = implEl.checked;
          var impl = Utils && includeImplications ? Utils.buildImplications('ttest') : null;
          var implSuffix = impl ? ' ' + impl.first + ' ' + impl.second : '';
          var prewrittenText = (config.prewritten.sh || '') + (config.prewritten.t ? ' ' + config.prewritten.t : '');
          if (includeImplications && Utils && prewrittenText) prewrittenText += implSuffix;
          block.textContent = prewrittenText;
        } else {
          block.textContent = '';
        }
      } else if (config.type !== 'tTest') {
        block.textContent = '';
      }
    }

    var copyBtn = document.getElementById('la-copy-interpretation');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    var saveTableBtn = document.getElementById('la-save-table');
    if (config.type === 'tTest') {
      if (copyBtn) copyBtn.disabled = false;
      if (saveTableBtn) saveTableBtn.disabled = false;
      if (regenBtn) regenBtn.disabled = false;
      var awmVal = config.awm && config.awm.sh ? config.awm.sh.value : 0;
      var awmDesc = config.awm && config.awm.sh ? config.awm.sh.qd : '—';
      updateLiveStats(awmVal, awmDesc);
    } else {
      if (copyBtn) copyBtn.disabled = true;
      if (saveTableBtn) saveTableBtn.disabled = true;
      if (regenBtn) regenBtn.disabled = true;
      updateLiveStats(null, null);
    }
    if (recomputeBtn) recomputeBtn.disabled = false;
    if (restoreBtn) restoreBtn.disabled = false;
    onInputChange();
  }

  function addLikertRowTwoGroup() {
    if (!currentLikertConfig || !currentLikertConfig.rows) return;
    currentLikertConfig.rows.push({
      indicator: '',
      sh: { wm: 0, qd: '', rank: 0 },
      t: { wm: 0, qd: '', rank: 0 }
    });
    renderTwoGroupWeighted(currentLikertConfig, { showComputed: false });
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    onInputChange();
    showToast('Row added. Click Compute to update ranks and AWM.');
  }

  function addLikertRow() {
    var tbody = document.getElementById('la-output-tbody');
    var thead = document.getElementById('la-output-thead');
    if (!tbody || !thead) return;
    var isTwoGroup = thead.querySelector('.la-thesis-table__group-row');
    if (isTwoGroup) {
      addLikertRowTwoGroup();
      return;
    }
    var emptyRow = tbody.querySelector('.la-output-empty');
    if (emptyRow) tbody.removeChild(emptyRow);
    var tr = document.createElement('tr');
    var nextIdx = tbody.querySelectorAll('tr').length;
    tr.setAttribute('data-la-row-index', String(nextIdx));
    tr.innerHTML =
      '<td class="la-thesis-table__td la-thesis-table__td--no">' + (nextIdx + 1) + '</td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--indicator"><textarea class="la-thesis-input la-thesis-input--indicator" data-la-indicator placeholder="New indicator" rows="2"></textarea></td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-wm placeholder="0.00"></td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-qd placeholder="Q.D."></td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-rank>—</td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--action"><button type="button" class="la-row-remove" aria-label="Remove row" data-la-remove>×</button></td>';
    tbody.appendChild(tr);
    if (currentLikertConfig && currentLikertConfig.rows) {
      currentLikertConfig.rows.push({ indicator: '', wm: 0, qd: '', rank: 0 });
    } else {
      syncLikertConfigFromDom();
    }
    var removeBtn = tr.querySelector('[data-la-remove]');
    if (removeBtn) removeBtn.addEventListener('click', function () { removeLikertOutputRow(tr); });
    tr.querySelectorAll('input, textarea').forEach(function (inp) {
      inp.addEventListener('input', onInputChange);
    });
    onInputChange();
  }

  function syncLikertConfigFromDom() {
    var tbody = document.getElementById('la-output-tbody');
    var thead = document.getElementById('la-output-thead');
    if (!tbody || !thead || thead.querySelector('.la-thesis-table__group-row')) return;
    var rows = [];
    tbody.querySelectorAll('tr').forEach(function (tr) {
      var indInput = tr.querySelector('[data-la-indicator]');
      var wmInput = tr.querySelector('[data-la-wm]');
      var qdInput = tr.querySelector('[data-la-qd]');
      var wm = wmInput && wmInput.value !== '' ? parseFloat(wmInput.value) : 0;
      if (isNaN(wm)) wm = 0;
      rows.push({
        indicator: (indInput && indInput.value || '').trim(),
        wm: wm,
        qd: (qdInput && qdInput.value || '').trim(),
        rank: 0
      });
    });
    if (rows.length === 0) return;
    currentLikertConfig = {
      rows: rows,
      awm: null,
      awmDesc: '',
      title: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value) || ''
    };
    usingPredefinedTable = true;
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    if (recomputeBtn) recomputeBtn.disabled = false;
    if (restoreBtn) restoreBtn.disabled = false;
  }

  /**
   * Apply pasted table data to the Likert table (Particulars, W.M., Q.D., Rank).
   * Only for single-group table (RP1). Builds currentLikertConfig and re-renders.
   */
  function applyPastedLikertData(mapped) {
    var thead = document.getElementById('la-output-thead');
    if (thead && thead.querySelector('.la-thesis-table__group-row')) return;
    var rows = [];
    for (var i = 0; i < mapped.particulars.length; i++) {
      var wmVal = mapped.wm[i];
      var rankVal = mapped.rank[i];
      var wm = wmVal !== '' && wmVal != null ? parseFloat(String(wmVal)) : 0;
      var rank = rankVal !== '' && rankVal != null ? (parseFloat(String(rankVal)) || 0) : 0;
      if (isNaN(wm)) wm = 0;
      rows.push({
        indicator: (mapped.particulars[i] || '').trim(),
        wm: wm,
        qd: (mapped.qd[i] || '').trim(),
        rank: rank
      });
    }
    currentLikertConfig = {
      rows: rows,
      awm: null,
      awmDesc: '',
      title: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value) || ''
    };
    usingPredefinedTable = true;
    renderPredefinedTableRows(currentLikertConfig, { showComputed: false });
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    updateLiveStats(null, null);
    onInputChange();
  }

  function applyPastedLikertTwoGroupData(mapped) {
    if (!mapped) return;
    var rows = [];
    for (var i = 0; i < mapped.particulars.length; i++) {
      var shWm = mapped.shWm[i] !== '' ? (parseFloat(mapped.shWm[i]) || 0) : 0;
      var tWm = mapped.tWm[i] !== '' ? (parseFloat(mapped.tWm[i]) || 0) : 0;
      var shRank = mapped.shRank[i] !== '' ? (parseFloat(mapped.shRank[i]) || 0) : 0;
      var tRank = mapped.tRank[i] !== '' ? (parseFloat(mapped.tRank[i]) || 0) : 0;
      if (isNaN(shWm)) shWm = 0;
      if (isNaN(tWm)) tWm = 0;
      rows.push({
        indicator: (mapped.particulars[i] || '').trim(),
        sh: { wm: shWm, qd: (mapped.shQd[i] || '').trim(), rank: shRank },
        t: { wm: tWm, qd: (mapped.tQd[i] || '').trim(), rank: tRank }
      });
    }
    currentLikertConfig = {
      rows: rows,
      awm: null,
      awmDesc: '',
      title: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value) || ''
    };
    if (currentLikertConfig.title && currentLikertConfig.rows.length) {
      currentLikertConfig.id = activeTableId || 'pasted';
    }
    usingPredefinedTable = true;
    renderTwoGroupWeighted(currentLikertConfig, { showComputed: false });
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    updateLiveStats(null, null);
    onInputChange();
  }

  function applyPastedLikertTTestData(mapped) {
    if (!mapped) return;
    var rows = [];
    for (var i = 0; i < mapped.label.length; i++) {
      rows.push({
        label: (mapped.label[i] || '').trim(),
        tValue: mapped.tValue[i] || '',
        tCritical: mapped.tCritical[i] || '',
        pValue: mapped.pValue[i] || '',
        decision: mapped.decision[i] || '',
        description: mapped.description[i] || ''
      });
    }
    currentLikertConfig = {
      type: 'tTest',
      rows: rows,
      title: (document.getElementById('la-table-title') && document.getElementById('la-table-title').value) || ''
    };
    usingPredefinedTable = true;
    renderTTestTable(currentLikertConfig);
    var block = document.getElementById('la-interpretation-block');
    if (block) {
      var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
      var implEl = document.getElementById('la-include-implications');
      var includeImplications = implEl && implEl.checked;
      var text = Gen && Gen.generateTTestInterpretation
        ? Gen.generateTTestInterpretation(currentLikertConfig, { tableTitle: currentLikertConfig.title, includeImplications: includeImplications })
        : '';
      block.textContent = text;
    }
    onInputChange();
  }

  function handleLikertPaste(e) {
    var clipboardData = e.clipboardData;
    if (!clipboardData) return;
    var Utils = typeof PasteTableUtils !== 'undefined' ? PasteTableUtils : null;
    if (!Utils) return;
    var thead = document.getElementById('la-output-thead');
    var parsed = Utils.parseClipboardToRows(clipboardData);
    if (!parsed.rows.length) return;
    e.preventDefault();
    var rows = parsed.rows;
    var errEl = document.getElementById('la-paste-table-error');
    var pasteZone = document.getElementById('la-paste-zone');

    var isTwoGroup = thead && thead.querySelector('.la-thesis-table__group-row');
    var isTTest = thead && (thead.textContent.indexOf('t-value') !== -1 || thead.textContent.indexOf('p-value') !== -1);

    if (isTwoGroup) {
      var skipHeaderTwo = Utils.isHeaderRow(rows[0], 'likert-twogroup');
      if (skipHeaderTwo) rows = rows.slice(1);
      if (!rows.length) return;
      var validationTwo = Utils.validateLikertTwoGroupPaste(rows);
      if (!validationTwo.valid) {
        if (errEl) errEl.textContent = validationTwo.message || 'Invalid format.';
        return;
      }
      if (errEl) errEl.textContent = '';
      var mappedTwo = Utils.mapToLikertTwoGroupRows(rows);
      if (mappedTwo) {
        applyPastedLikertTwoGroupData(mappedTwo);
        if (pasteZone) pasteZone.textContent = 'Paste here (Ctrl + V)';
        var r2 = rows.length;
        var c2 = rows[0] ? rows[0].length : 0;
        showToast('Detected ' + r2 + ' row' + (r2 !== 1 ? 's' : '') + ' × ' + c2 + ' column' + (c2 !== 1 ? 's' : '') + '. Table updated. You can edit cells and click Compute.');
      }
      return;
    }

    if (isTTest) {
      var skipHeaderT = Utils.isHeaderRow(rows[0], 'likert-ttest');
      if (skipHeaderT) rows = rows.slice(1);
      if (!rows.length) return;
      var validationT = Utils.validateLikertTTestPaste(rows);
      if (!validationT.valid) {
        if (errEl) errEl.textContent = validationT.message || 'Invalid format.';
        return;
      }
      if (errEl) errEl.textContent = '';
      var mappedT = Utils.mapToLikertTTestRows(rows);
      if (mappedT) {
        applyPastedLikertTTestData(mappedT);
        if (pasteZone) pasteZone.textContent = 'Paste here (Ctrl + V)';
        var rT = rows.length;
        var cT = rows[0] ? rows[0].length : 0;
        showToast('Detected ' + rT + ' row' + (rT !== 1 ? 's' : '') + ' × ' + cT + ' column' + (cT !== 1 ? 's' : '') + '. Table updated. You can edit cells.');
      }
      return;
    }

    var skipHeader = Utils.isHeaderRow(rows[0], 'likert');
    if (skipHeader) rows = rows.slice(1);
    if (!rows.length) return;
    var validation = Utils.validateLikertPaste(rows);
    if (!validation.valid) {
      if (errEl) errEl.textContent = validation.message || 'Invalid format.';
      return;
    }
    if (errEl) errEl.textContent = '';
    var mapped = Utils.mapToLikertRows(rows, skipHeader);
    if (mapped) {
      applyPastedLikertData(mapped);
      if (pasteZone) {
        pasteZone.textContent = 'Paste here (Ctrl + V)';
        pasteZone.classList.remove('la-paste-zone--has-content');
      }
      var r1 = rows.length;
      var c1 = rows[0] ? rows[0].length : 0;
      showToast('Detected ' + r1 + ' row' + (r1 !== 1 ? 's' : '') + ' × ' + c1 + ' column' + (c1 !== 1 ? 's' : '') + '. Table updated. You can edit cells and click Compute.');
    }
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

  /** Remove a row from the output table (la-output-tbody) and update config. */
  function removeLikertOutputRow(tr) {
    var tbody = document.getElementById('la-output-tbody');
    if (!tbody || tr.parentNode !== tbody) return;
    var idx = parseInt(tr.getAttribute('data-la-row-index'), 10);
    if (isNaN(idx)) idx = Array.prototype.indexOf.call(tbody.querySelectorAll('tr'), tr);
    tbody.removeChild(tr);
    if (currentLikertConfig && currentLikertConfig.rows && idx >= 0 && idx < currentLikertConfig.rows.length) {
      currentLikertConfig.rows.splice(idx, 1);
    }
    updateLikertOutputRowNumbers();
    onInputChange();
  }

  /** Update No. column and data-la-row-index for all rows in la-output-tbody. */
  function updateLikertOutputRowNumbers() {
    var tbody = document.getElementById('la-output-tbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      if (tr.classList.contains('la-output-empty')) continue;
      tr.setAttribute('data-la-row-index', String(i));
      var noCell = tr.querySelector('.la-thesis-table__td--no');
      if (noCell) noCell.textContent = i + 1;
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
        var indInput = tr.querySelector('[data-la-indicator]');
        var ind = (indInput && indInput.value != null) ? indInput.value.trim() : (currentLikertConfig.rows[idx] && currentLikertConfig.rows[idx].indicator) || '';
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
      var copyBtn = document.getElementById('la-copy-interpretation');
      var saveTableBtn = document.getElementById('la-save-table');
      var regenBtn = document.getElementById('la-regenerate-interpretation');
      if (copyBtn) copyBtn.disabled = false;
      if (saveTableBtn) saveTableBtn.disabled = false;
      if (regenBtn) regenBtn.disabled = false;
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
      var indInput = tr.querySelector('[data-la-indicator]');
      var ind = (indInput && indInput.value != null) ? indInput.value.trim() : (base && base.indicator) || '';
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

    // Always compute ranks from W.M. (descending) so Rank column shows 1, 2, 3...
    computeRanks(rowsSh.slice().sort(function (a, b) { return b.weightedMean - a.weightedMean; }));
    computeRanks(rowsT.slice().sort(function (a, b) { return b.weightedMean - a.weightedMean; }));
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
    var awmShDesc = doAutoQd ? getQualitativeDescription(awmSh, mapping2) : (currentLikertConfig.awm && currentLikertConfig.awm.sh && currentLikertConfig.awm.sh.qd) || getQualitativeDescription(awmSh, mapping2) || '';
    var awmTDesc = doAutoQd ? getQualitativeDescription(awmT, mapping2) : (currentLikertConfig.awm && currentLikertConfig.awm.t && currentLikertConfig.awm.t.qd) || getQualitativeDescription(awmT, mapping2) || '';

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
    if (block) block.textContent = (laInterpretationSh || '') + (laInterpretationT ? '\n\n' + laInterpretationT : '');
    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveTableBtn = document.getElementById('la-save-table');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = false;
    if (saveTableBtn) saveTableBtn.disabled = false;
    if (regenBtn) regenBtn.disabled = false;
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
    var saveTableBtn = document.getElementById('la-save-table');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    if (copyBtn) copyBtn.disabled = false;
    if (saveTableBtn) saveTableBtn.disabled = false;
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

  /**
   * Build RP1 Likert interpretation in thesis-ready format (Tables 10–22).
   * Format: opener + indicators grouped by Q.D. (scale first, then enumerate) + AWM sentence + indicates + implies.
   */
  function buildRp1LikertInterpretation(rows, awm, awmDesc, tableId, variantIndex, lastOpener) {
    var cfg = RP1_LIKERT_INTERPRETATION_CONFIG[tableId];
    if (!cfg || !rows || !rows.length) return '';

    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;
    var includeImplications = true;
    var implEl = document.getElementById('la-include-implications');
    if (implEl) includeImplications = implEl.checked;

    var opener = cfg.opener;
    if (Gen && cfg.openerAlternatives && cfg.openerAlternatives.length) {
      opener = cfg.openerAlternatives[Math.abs(vi) % cfg.openerAlternatives.length];
    }

    var indicatorPart = buildIndicatorsByQdGroups(rows);
    var awmStr = awm.toFixed(2);
    var UtilsRp1 = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var expandQdRp1 = UtilsRp1 && UtilsRp1.expandQualitativeDescription ? UtilsRp1.expandQualitativeDescription : function (x) { return x || ''; };
    var descRaw = awmDesc || '—';
    var desc = expandQdRp1(descRaw);
    if (!desc || desc === '—') desc = descRaw;

    var text;
    if (cfg.isExecutiveSummary) {
      var areaParts = rows.map(function (r) {
        return (r.indicator || '').toLowerCase() + ' having a weighted mean of ' + r.weightedMean.toFixed(2);
      });
      var areaList = rows.length >= 2
        ? ', with ' + areaParts.slice(0, -1).join(', ') + ', and ' + areaParts[areaParts.length - 1]
        : '';
      var execBody = tableId === 't21'
        ? 'all areas are considered serious' + areaList + '. '
        : 'the competencies across all quarters are fully realized' + areaList + '. ';
      var signifiesVerb = (Gen && includeImplications) ? (Gen.getSynonym('signifies', vi) || 'signifies') : 'signifies';
      text = opener + execBody +
        'The average weighted mean of ' + awmStr + ' ' + signifiesVerb + ' that teachers view the ' +
        (tableId === 't21' ? 'challenges' : 'competencies') + ' as ' + desc + ' overall. ';
    } else {
      var sent1 = opener + indicatorPart;
      var construct = cfg.awmConstruct || 'the construct';
      var signifiesVerb = (Gen && includeImplications) ? (Gen.getSynonym('signifies', vi) || 'signifies') : 'signifies';
      var sent2 = 'The average weighted mean of ' + awmStr + ' ' + signifiesVerb + ' that teachers view ' + construct + ' as ' + desc + '.';
      text = sent1 + ' ' + sent2;
    }

    if (includeImplications && cfg.indicates) {
      var lead1 = Gen ? (Gen.getSynonym('indicatesLead', vi) || 'This indicates that') : 'This indicates that';
      var rest1 = cfg.indicates.replace(/^This (indicates|suggests|implies) that\s+/i, '');
      text += ' ' + lead1 + ' ' + rest1;
    }
    if (includeImplications && cfg.implies) {
      var lead2 = Gen ? (Gen.getSynonym('furtherLead', vi + 1) || 'This further implies that') : 'This further implies that';
      var rest2 = cfg.implies.replace(/^This further (implies|suggests|indicates) that\s+/i, '');
      text += ' ' + lead2 + ' ' + rest2;
    }
    return text.trim();
  }

  var RP2_LIKERT_TEACHERS_TRANSITION = [
    'Meanwhile, teacher respondents ',
    'On the other hand, teacher respondents ',
    'Similarly, teacher respondents ',
    'In contrast, teacher respondents '
  ];

  /**
   * Build RP2 two-group Likert interpretation (Tables 10–20).
   * Format: section title + school heads paragraph + teachers paragraph.
   * Returns { sectionTitle, shPara, tPara }.
   */
  function buildRp2TwoGroupLikertInterpretation(rowsSh, rowsT, awmSh, awmT, awmShDesc, awmTDesc, tableId, variantIndex) {
    var cfg = RP2_LIKERT_INTERPRETATION_CONFIG[tableId];
    if (!cfg || !rowsSh || !rowsT) return { sectionTitle: '', shPara: '', tPara: '' };

    var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
    var vi = typeof variantIndex === 'number' ? variantIndex : 0;
    var includeImplications = true;
    var implEl = document.getElementById('la-include-implications');
    if (implEl) includeImplications = implEl.checked;

    function buildClausesByQd(rows) {
      return buildIndicatorsByQdGroups(rows);
    }

    var clausesSh = buildClausesByQd(rowsSh);
    var clausesT = buildClausesByQd(rowsT);

    var awmShStr = awmSh.toFixed(2);
    var awmTStr = awmT.toFixed(2);
    var UtilsRp2 = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var expandQdRp2 = UtilsRp2 && UtilsRp2.expandQualitativeDescription ? UtilsRp2.expandQualitativeDescription : function (x) { return x || ''; };
    var descSh = expandQdRp2(awmShDesc || '—') || awmShDesc || '—';
    var descT = expandQdRp2(awmTDesc || '—') || awmTDesc || '—';
    var construct = cfg.headsAwmConstruct || 'the construct';

    var shIntro = (cfg.headsRated === false)
      ? cfg.headsOpener
      : (cfg.headsOpener + 'school head respondents rated ');
    if (Gen && cfg.headsOpenerAlternatives && cfg.headsOpenerAlternatives.length) {
      var baseOpener = cfg.headsOpenerAlternatives[Math.abs(vi) % cfg.headsOpenerAlternatives.length];
      shIntro = (cfg.headsRated === false) ? baseOpener : (baseOpener + 'school head respondents rated ');
    }
    var signifiesSh = Gen ? (Gen.getSynonym('signifies', vi) || 'signifies') : 'signifies';
    var shPara = shIntro + clausesSh + ' ' +
      'The average weighted mean of ' + awmShStr + ' ' + signifiesSh + ' that school heads generally view ' + construct + ' as ' + descSh + '.';
    if (includeImplications && cfg.headsIndicates) {
      var leadSh1 = Gen ? (Gen.getSynonym('indicatesLead', vi) || 'This indicates that') : 'This indicates that';
      shPara += ' ' + leadSh1 + ' ' + cfg.headsIndicates;
    }
    if (includeImplications && cfg.headsImplies) {
      var leadSh2 = Gen ? (Gen.getSynonym('furtherLead', vi) || 'This further implies that') : 'This further implies that';
      shPara += ' ' + leadSh2 + ' ' + cfg.headsImplies;
    }

    var teachersOpener = cfg.teachersOpener || RP2_LIKERT_TEACHERS_TRANSITION[0];
    if (Gen && cfg.teachersOpenerAlternatives && cfg.teachersOpenerAlternatives.length) {
      teachersOpener = cfg.teachersOpenerAlternatives[Math.abs(vi) % cfg.teachersOpenerAlternatives.length];
    } else if (Gen && RP2_LIKERT_TEACHERS_TRANSITION) {
      teachersOpener = RP2_LIKERT_TEACHERS_TRANSITION[Math.abs(vi) % RP2_LIKERT_TEACHERS_TRANSITION.length];
    }
    var signifiesT = Gen ? (Gen.getSynonym('signifies', vi + 1) || 'signifies') : 'signifies';
    var tPara = teachersOpener + 'rated ' + clausesT + ' ' +
      'The average weighted mean of ' + awmTStr + ' ' + signifiesT + ' that teachers view ' + construct + ' as ' + descT + '.';
    if (includeImplications && cfg.teachersIndicates) {
      var leadT1 = Gen ? (Gen.getSynonym('indicatesLead', vi + 1) || 'This indicates that') : 'This indicates that';
      tPara += ' ' + leadT1 + ' ' + cfg.teachersIndicates;
    }
    if (includeImplications && cfg.teachersImplies) {
      var leadT2 = Gen ? (Gen.getSynonym('furtherLead', vi + 1) || 'This further implies that') : 'This further implies that';
      tPara += ' ' + leadT2 + ' ' + cfg.teachersImplies;
    }

    return { sectionTitle: cfg.sectionTitle || '', shPara: shPara.trim(), tPara: tPara.trim() };
  }

  /**
   * Group indicators by identical weighted mean and format enumeration.
   * Rule: indicators with the same W.M. are mentioned together using "each with a weighted mean of X.XX".
   * Format: "A" and "B" each with a weighted mean of 4.20; "C" with a weighted mean of 4.10; and "D" and "E" each with a weighted mean of 4.05
   */
  function formatIndicatorsEnumeration(indicatorRows) {
    var getWm = function (r) { return r.weightedMean != null ? r.weightedMean : (r.wm != null ? r.wm : 0); };
    var sorted = indicatorRows.slice().sort(function (a, b) { return getWm(b) - getWm(a); });
    if (!sorted.length) return '';

    var groups = [];
    var currentWm = getWm(sorted[0]);
    var currentGroup = [];
    for (var i = 0; i < sorted.length; i++) {
      var wm = getWm(sorted[i]);
      if (wm !== currentWm && currentGroup.length) {
        groups.push({ wm: currentWm, rows: currentGroup });
        currentGroup = [];
        currentWm = wm;
      }
      currentGroup.push(sorted[i]);
    }
    if (currentGroup.length) groups.push({ wm: currentWm, rows: currentGroup });

    var parts = groups.map(function (g) {
      var labels = g.rows.map(function (r) { return '"' + (r.indicator || '').trim() + '"'; });
      var wmStr = g.wm != null ? g.wm.toFixed(2) : '—';
      if (labels.length === 1) return labels[0] + ' with a weighted mean of ' + wmStr;
      if (labels.length === 2) return labels[0] + ' and ' + labels[1] + ' each with a weighted mean of ' + wmStr;
      return labels.slice(0, -1).join(', ') + ', and ' + labels[labels.length - 1] + ' each with a weighted mean of ' + wmStr;
    });

    if (parts.length <= 1) return parts[0] || '';
    return parts.slice(0, -1).join('; ') + '; and ' + parts[parts.length - 1];
  }

  /**
   * Group indicators by Q.D., sort groups by scale level (highest W.M. first), and build interpretation body.
   * Returns the enumeration text with Q.D. groups introduced first.
   */
  function buildIndicatorsByQdGroups(rows) {
    var qdMap = {};
    rows.forEach(function (r) {
      var qd = (r.qualitativeDescription || r.qd || '').trim() || '—';
      if (!qdMap[qd]) qdMap[qd] = [];
      qdMap[qd].push(r);
    });
    var qdKeys = Object.keys(qdMap).filter(function (k) { return k !== '—'; });
    qdKeys.sort(function (a, b) {
      var maxA = Math.max.apply(null, qdMap[a].map(function (r) { return r.weightedMean || 0; }));
      var maxB = Math.max.apply(null, qdMap[b].map(function (r) { return r.weightedMean || 0; }));
      return maxB - maxA;
    });
    if (qdMap['—'] && qdMap['—'].length) qdKeys.push('—');

    var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var expandQd = Utils && Utils.expandQualitativeDescription ? Utils.expandQualitativeDescription : function (x) { return x || ''; };
    var segments = [];
    qdKeys.forEach(function (qd, idx) {
      var groupRows = qdMap[qd];
      if (!groupRows || !groupRows.length) return;
      var enumText = formatIndicatorsEnumeration(groupRows);
      var qdFull = expandQd(qd);
      if (idx === 0) {
        segments.push('the indicators rated as ' + qdFull + ' include the following: ' + enumText);
      } else {
        segments.push('While other indicators were rated as ' + qdFull + '. These include: ' + enumText);
      }
    });

    if (segments.length === 0) {
      var sorted = rows.slice().sort(function (a, b) { return b.weightedMean - a.weightedMean; });
      return 'the indicators include ' + formatIndicatorsEnumeration(sorted);
    }
    return segments.join('. ');
  }

  /** Build one interpretation for a group: opener + Q.D.-grouped enumeration + AWM + implications. */
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

    var indicatorBody = buildIndicatorsByQdGroups(rows);

    var Utils2 = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
    var expandQd = Utils2 && Utils2.expandQualitativeDescription ? Utils2.expandQualitativeDescription : function (x) { return x || ''; };
    var descRaw = awmDesc || '—';
    var desc = expandQd(descRaw);
    if (!desc || desc === '—') desc = descRaw || '—';
    var sent1 = opening + theme + ', ' + indicatorBody + '.';
    var awmStr = awm.toFixed(2);
    var sent3 = groupLabel
      ? 'The average weighted mean of ' + awmStr + ' signifies that ' + groupLabel + ' view ' + (theme.indexOf('the ') === 0 ? theme : 'the ' + theme) + ' as ' + desc + '.'
      : 'The average weighted mean of ' + awmStr + ' signifies that the indicators are generally assessed as ' + desc + '.';
    var text = sent1 + ' ' + sent3;
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

    var tableId = (activeProjectId === 'rp1' && currentLikertConfig) ? currentLikertConfig.id : '';
    var rp1Cfg = tableId && RP1_LIKERT_INTERPRETATION_CONFIG[tableId];
    if (rp1Cfg) {
      return buildRp1LikertInterpretation(data.indicators, data.awm, data.awmDesc, tableId, variantIndex, lastOpener);
    }

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

    var tableId = currentLikertConfig.id || '';

    // RP2 Tables 10–20: use dynamic thesis-ready format (section title + school heads + teachers)
    if (activeProjectId === 'rp2' && RP2_LIKERT_INTERPRETATION_CONFIG[tableId]) {
      var rowsSh, rowsT, awmSh, awmT, awmShDesc, awmTDesc;
      if (currentTwoGroupData) {
        rowsSh = currentTwoGroupData.rowsSh;
        rowsT = currentTwoGroupData.rowsT;
        awmSh = currentTwoGroupData.awmSh;
        awmT = currentTwoGroupData.awmT;
        awmShDesc = currentTwoGroupData.awmShDesc;
        awmTDesc = currentTwoGroupData.awmTDesc;
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
      }
      var rp2Result = buildRp2TwoGroupLikertInterpretation(rowsSh, rowsT, awmSh, awmT, awmShDesc, awmTDesc, tableId, variantIndex);
      laInterpretationSh = rp2Result.shPara;
      laInterpretationT = rp2Result.tPara;
      return;
    }

    // RP2 T-test (t21, t22) and other prewritten: use stored paragraphs
    if (activeProjectId === 'rp2' && currentLikertConfig.prewritten) {
      laInterpretationSh = currentLikertConfig.prewritten.sh || '';
      laInterpretationT = currentLikertConfig.prewritten.t || '';
      return;
    }
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

  /**
   * Generate interpretation using automatic table type detection.
   * Routes to single-likert, two-group-likert, or ttest generator based on loaded columns.
   */
  function generateInterpretation() {
    var block = document.getElementById('la-interpretation-block');
    if (!block) return '';

    var detectedType = getDetectedLikertTableType();

    if (detectedType === 'ttest' && currentLikertConfig && currentLikertConfig.rows && currentLikertConfig.rows.length) {
      var Gen = typeof ThesisTextGenerator !== 'undefined' ? ThesisTextGenerator : null;
      var implEl = document.getElementById('la-include-implications');
      var includeImplications = implEl && implEl.checked;
      var text = Gen && Gen.generateTTestInterpretation
        ? Gen.generateTTestInterpretation(currentLikertConfig, {
            tableTitle: currentLikertConfig.title || currentLikertConfig.tableTitle,
            includeImplications: includeImplications
          })
        : '';
      block.textContent = text;
      return text;
    }

    if (detectedType === 'two-group-likert' && (currentLikertConfig || currentTwoGroupData)) {
      generateTwoGroupInterpretations(0, '');
      var text = (laInterpretationSh || '') + (laInterpretationT ? '\n\n' + laInterpretationT : '');
      block.textContent = text;
      return text;
    }

    var data = computedData;
    if (!data.indicators.length) return '';

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

    var detectedType = getDetectedLikertTableType();
    var isLikertTwoGroup = detectedType === 'two-group-likert';
    var isLikertTTest = detectedType === 'ttest';

    if (isLikertTwoGroup && (currentLikertConfig || currentTwoGroupData)) {
      var tableId = (currentLikertConfig && (currentLikertConfig.id || currentLikertConfig.title)) || 'likert';
      tableId = String(tableId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);

      // For RP2 prewritten tables (Tables 10–22), use the dedicated
      // applyRp2PrewrittenVariation helper so Regenerate varies openers
      // and verbs but keeps the same paragraph structure.
      if (Gen && currentLikertConfig.prewritten && typeof Gen.applyRp2PrewrittenVariation === 'function') {
        var baseSh = currentLikertConfig.prewritten.sh || '';
        var baseT = currentLikertConfig.prewritten.t || '';
        var generatorPre = function (vi) {
          return Gen.applyRp2PrewrittenVariation(baseSh, baseT, vi);
        };
        var resultPre = Gen.generateWithVariation(generatorPre, 'likert_rp2_pre', tableId);
        setFullInterpretation(resultPre.text);
        showToast('Interpretation regenerated.');
        return;
      }

      // Fallback for any other RP2 two-group tables: rebuild and show both groups together.
      var generator = function (vi, lastOpener) {
        generateTwoGroupInterpretations(vi, lastOpener);
        return (laInterpretationSh || '') + (laInterpretationT ? '\n\n' + laInterpretationT : '');
      };
      if (Gen) {
        var resultTwo = Gen.generateWithVariation(generator, 'likert_rp2', tableId);
        setFullInterpretation(resultTwo.text);
      } else {
        generateTwoGroupInterpretations(0, '');
        setFullInterpretation((laInterpretationSh || '') + (laInterpretationT ? '\n\n' + laInterpretationT : ''));
      }
      showToast('Interpretation regenerated.');
      return;
    }
    if (isLikertTTest && currentLikertConfig) {
      var hasTTestRowData = currentLikertConfig.rows && currentLikertConfig.rows.length && currentLikertConfig.rows.some(function (r) {
        var t = r.tValue != null ? String(r.tValue).trim() : '';
        return t !== '';
      });
      if (Gen && Gen.generateTTestInterpretation && hasTTestRowData) {
        var implEl = document.getElementById('la-include-implications');
        var includeImplications = implEl && implEl.checked;
        var generatorT = function (vi) {
          return Gen.generateTTestInterpretation(currentLikertConfig, {
            tableTitle: currentLikertConfig.title || currentLikertConfig.tableTitle,
            includeImplications: includeImplications,
            variantIndex: vi
          });
        };
        var tableIdT = (currentLikertConfig.id || currentLikertConfig.title || 'ttest').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
        var resultT = Gen.generateWithVariation(generatorT, 'likert_ttest', tableIdT);
        setFullInterpretation(resultT.text);
      } else if (currentLikertConfig.prewritten) {
        var prewrittenText = (currentLikertConfig.prewritten.sh || '') + (currentLikertConfig.prewritten.t ? ' ' + currentLikertConfig.prewritten.t : '');
        var Utils = typeof ThesisInterpretationUtils !== 'undefined' ? ThesisInterpretationUtils : null;
        var implEl2 = document.getElementById('la-include-implications');
        if (implEl2 && implEl2.checked && Utils && prewrittenText) {
          var impl = Utils.buildImplications('ttest');
          prewrittenText += ' ' + impl.first + ' ' + impl.second;
        }
        setFullInterpretation(prewrittenText);
      }
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

  /**
   * Copy All: table title + full table (W.M., Q.D., Rank, AWM) + interpretation as rich HTML for Word.
   * Syncs from DOM before copy to ensure all visible rows and columns are included.
   */
  function copyInterpretation() {
    var block = document.getElementById('la-interpretation-block');
    var interpText = laInterpTwoGroup && (laInterpretationSh || laInterpretationT)
      ? (laInterpretationSh || '') + (laInterpretationT ? '\n\n' + laInterpretationT : '')
      : (block && block.textContent ? block.textContent.trim() : '');
    if (!interpText) {
      showToast('Please compute and generate the interpretation first before copying.', true);
      return;
    }
    if (!currentLikertConfig || !currentLikertConfig.rows || !currentLikertConfig.rows.length) {
      showToast('Please compute and generate the interpretation first before copying.', true);
      return;
    }
    var tbody = document.getElementById('la-output-tbody');
    if (tbody && (currentLikertConfig.type === 'twoGroup' || (currentLikertConfig.rows[0] && (currentLikertConfig.rows[0].sh || currentLikertConfig.rows[0].t)))) {
      var rowsFromDom = [];
      tbody.querySelectorAll('tr').forEach(function (tr, idx) {
        var base = currentLikertConfig.rows[idx];
        var indInput = tr.querySelector('[data-la-indicator]');
        var ind = (indInput && indInput.value != null) ? indInput.value.trim() : (base && base.indicator) || '';
        var shWmInput = tr.querySelector('[data-la-sh-wm]');
        var shQdInput = tr.querySelector('[data-la-sh-qd]');
        var tWmInput = tr.querySelector('[data-la-t-wm]');
        var tQdInput = tr.querySelector('[data-la-t-qd]');
        var shWm = shWmInput && shWmInput.value !== '' ? parseFloat(shWmInput.value) : (base && base.sh) ? base.sh.wm : 0;
        var tWm = tWmInput && tWmInput.value !== '' ? parseFloat(tWmInput.value) : (base && base.t) ? base.t.wm : 0;
        if (isNaN(shWm)) shWm = 0;
        if (isNaN(tWm)) tWm = 0;
        var shQd = (shQdInput && shQdInput.value) ? shQdInput.value.trim() : (base && base.sh) ? base.sh.qd : '';
        var tQd = (tQdInput && tQdInput.value) ? tQdInput.value.trim() : (base && base.t) ? base.t.qd : '';
        var shRankCell = tr.querySelector('[data-la-sh-rank]');
        var tRankCell = tr.querySelector('[data-la-t-rank]');
        var shRank = shRankCell && shRankCell.textContent ? parseFloat(shRankCell.textContent) : (base && base.sh) ? base.sh.rank : null;
        var tRank = tRankCell && tRankCell.textContent ? parseFloat(tRankCell.textContent) : (base && base.t) ? base.t.rank : null;
        rowsFromDom.push({
          indicator: ind,
          sh: { wm: shWm, qd: shQd, rank: shRank },
          t: { wm: tWm, qd: tQd, rank: tRank }
        });
      });
      if (rowsFromDom.length > 0) {
        var awmShEl = document.getElementById('la-awm-sh-value');
        var awmTEl = document.getElementById('la-awm-t-value');
        var awmShDescEl = document.getElementById('la-awm-sh-desc');
        var awmTDescEl = document.getElementById('la-awm-t-desc');
        currentLikertConfig = {
          rows: rowsFromDom,
          awm: {
            sh: {
              value: awmShEl && awmShEl.textContent ? parseFloat(awmShEl.textContent) : (currentLikertConfig.awm && currentLikertConfig.awm.sh ? currentLikertConfig.awm.sh.value : 0),
              qd: awmShDescEl ? awmShDescEl.textContent : (currentLikertConfig.awm && currentLikertConfig.awm.sh ? currentLikertConfig.awm.sh.qd : '')
            },
            t: {
              value: awmTEl && awmTEl.textContent ? parseFloat(awmTEl.textContent) : (currentLikertConfig.awm && currentLikertConfig.awm.t ? currentLikertConfig.awm.t.value : 0),
              qd: awmTDescEl ? awmTDescEl.textContent : (currentLikertConfig.awm && currentLikertConfig.awm.t ? currentLikertConfig.awm.t.qd : '')
            }
          },
          type: currentLikertConfig.type,
          title: currentLikertConfig.title,
          theme: currentLikertConfig.theme
        };
      }
    }
    var titleEl = document.getElementById('la-table-title');
    var tableTitle = (titleEl && titleEl.value) ? titleEl.value.trim() : '';
    var tableHtml = '';
    var tablePlain = '';
    var styleCell = 'border: 1px solid #000;';
    var styleRight = styleCell + ' text-align: right;';
    var styleCenter = styleCell + ' text-align: center;';
    var styleLeft = styleCell + ' text-align: left;';

    if (currentLikertConfig.type === 'tTest') {
      tableHtml =
        '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">' +
        '<thead><tr><th style="' + styleCenter + '; width: 2em;">No.</th><th style="' + styleLeft + '">Particulars</th><th style="' + styleRight + '">t-value</th><th style="' + styleRight + '">t-critical</th>' +
        '<th style="' + styleRight + '">p-value</th><th style="' + styleLeft + '">Decision</th><th style="' + styleLeft + '">Description</th></tr></thead><tbody>';
      tablePlain = 'No.\tParticulars\tt-value\tt-critical\tp-value\tDecision\tDescription\n';
      (currentLikertConfig.rows || []).forEach(function (row, idx) {
        var no = idx + 1;
        var label = row.label || '';
        var tVal = row.tValue != null ? String(row.tValue) : '';
        var tCrit = row.tCritical != null ? String(row.tCritical) : '';
        var pVal = row.pValue != null ? String(row.pValue) : '';
        var dec = row.decision || '';
        var desc = row.description || '';
        tableHtml += '<tr><td style="' + styleCenter + '">' + no + '</td><td style="' + styleLeft + '">' + escapeHtml(label) + '</td><td style="' + styleRight + '">' + escapeHtml(tVal) + '</td><td style="' + styleRight + '">' + escapeHtml(tCrit) + '</td>' +
          '<td style="' + styleRight + '">' + escapeHtml(pVal) + '</td><td style="' + styleLeft + '">' + escapeHtml(dec) + '</td><td style="' + styleLeft + '">' + escapeHtml(desc) + '</td></tr>';
        tablePlain += no + '\t' + label + '\t' + tVal + '\t' + tCrit + '\t' + pVal + '\t' + dec + '\t' + desc + '\n';
      });
      tableHtml += '</tbody></table>';
    } else if (currentLikertConfig.type === 'twoGroup' || (currentLikertConfig.rows[0] && (currentLikertConfig.rows[0].sh || currentLikertConfig.rows[0].t))) {
      var awmSh = currentLikertConfig.awm && currentLikertConfig.awm.sh ? currentLikertConfig.awm.sh : { value: 0, qd: '—' };
      var awmT = currentLikertConfig.awm && currentLikertConfig.awm.t ? currentLikertConfig.awm.t : { value: 0, qd: '—' };
      tableHtml =
        '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">' +
        '<thead><tr><th style="' + styleCenter + '; width: 2em;">No.</th><th style="' + styleLeft + '">Particulars</th><th colspan="3" style="' + styleCenter + '">School Heads</th><th colspan="3" style="' + styleCenter + '">Teachers</th></tr>' +
        '<tr><th style="' + styleCenter + '"></th><th style="' + styleLeft + '"></th><th style="' + styleRight + '">W.M.</th><th style="' + styleLeft + '">Q.D.</th><th style="' + styleCenter + '">Rank</th>' +
        '<th style="' + styleRight + '">W.M.</th><th style="' + styleLeft + '">Q.D.</th><th style="' + styleCenter + '">Rank</th></tr></thead><tbody>';
      tablePlain = 'No.\tParticulars\tSchool Heads W.M.\tQ.D.\tRank\tTeachers W.M.\tQ.D.\tRank\n';
      currentLikertConfig.rows.forEach(function (row, idx) {
        var no = idx + 1;
        var sh = row.sh || {};
        var t = row.t || {};
        var shWm = typeof sh.wm === 'number' ? sh.wm.toFixed(2) : '';
        var tWm = typeof t.wm === 'number' ? t.wm.toFixed(2) : '';
        var shRank = sh.rank != null ? (sh.rank % 1 === 0 ? sh.rank : sh.rank.toFixed(1)) : '';
        var tRank = t.rank != null ? (t.rank % 1 === 0 ? t.rank : t.rank.toFixed(1)) : '';
        tableHtml += '<tr><td style="' + styleCenter + '">' + no + '</td><td style="' + styleLeft + '">' + escapeHtml(row.indicator || '') + '</td>' +
          '<td style="' + styleRight + '">' + shWm + '</td><td style="' + styleLeft + '">' + escapeHtml(sh.qd || '') + '</td><td style="' + styleCenter + '">' + shRank + '</td>' +
          '<td style="' + styleRight + '">' + tWm + '</td><td style="' + styleLeft + '">' + escapeHtml(t.qd || '') + '</td><td style="' + styleCenter + '">' + tRank + '</td></tr>';
        tablePlain += no + '\t' + (row.indicator || '') + '\t' + shWm + '\t' + (sh.qd || '') + '\t' + shRank + '\t' + tWm + '\t' + (t.qd || '') + '\t' + tRank + '\n';
      });
      tableHtml += '</tbody><tfoot><tr><td style="' + styleCenter + '"></td><td style="' + styleLeft + '"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
        '<td style="' + styleRight + '"><strong>' + (typeof awmSh.value === 'number' ? awmSh.value.toFixed(2) : '—') + '</strong></td>' +
        '<td style="' + styleLeft + '"><strong>' + escapeHtml(awmSh.qd || '—') + '</strong></td><td style="' + styleCenter + '"></td>' +
        '<td style="' + styleRight + '"><strong>' + (typeof awmT.value === 'number' ? awmT.value.toFixed(2) : '—') + '</strong></td>' +
        '<td style="' + styleLeft + '"><strong>' + escapeHtml(awmT.qd || '—') + '</strong></td><td style="' + styleCenter + '"></td></tr></tfoot></table>';
      tablePlain += '\tAVERAGE WEIGHTED MEAN\t' + (typeof awmSh.value === 'number' ? awmSh.value.toFixed(2) : '—') + '\t' + (awmSh.qd || '') + '\t\t' + (typeof awmT.value === 'number' ? awmT.value.toFixed(2) : '—') + '\t' + (awmT.qd || '') + '\n';
    } else {
      var awm = currentLikertConfig.awm;
      var awmDesc = currentLikertConfig.awmDesc != null ? currentLikertConfig.awmDesc : '—';
      tableHtml =
        '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">' +
        '<thead><tr><th style="' + styleCenter + '; width: 2em;">No.</th><th style="' + styleLeft + '">Particulars</th><th style="' + styleRight + '">W.M.</th><th style="' + styleLeft + '">Q.D.</th><th style="' + styleCenter + '">Rank</th></tr></thead><tbody>';
      tablePlain = 'No.\tParticulars\tW.M.\tQ.D.\tRank\n';
      currentLikertConfig.rows.forEach(function (row, idx) {
        var no = idx + 1;
        var wm = typeof row.wm === 'number' ? row.wm.toFixed(2) : '';
        var rank = row.rank != null ? (row.rank % 1 === 0 ? row.rank : row.rank.toFixed(1)) : '';
        tableHtml += '<tr><td style="' + styleCenter + '">' + no + '</td><td style="' + styleLeft + '">' + escapeHtml(row.indicator || '') + '</td>' +
          '<td style="' + styleRight + '">' + wm + '</td><td style="' + styleLeft + '">' + escapeHtml(row.qd || '') + '</td><td style="' + styleCenter + '">' + rank + '</td></tr>';
        tablePlain += no + '\t' + (row.indicator || '') + '\t' + wm + '\t' + (row.qd || '') + '\t' + rank + '\n';
      });
      tableHtml += '</tbody><tfoot><tr><td style="' + styleCenter + '"></td><td style="' + styleLeft + '"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
        '<td style="' + styleRight + '"><strong>' + (typeof awm === 'number' ? awm.toFixed(2) : '—') + '</strong></td>' +
        '<td style="' + styleLeft + '"><strong>' + escapeHtml(awmDesc) + '</strong></td><td style="' + styleCenter + '"></td></tr></tfoot></table>';
      tablePlain += '\tAVERAGE WEIGHTED MEAN\t' + (typeof awm === 'number' ? awm.toFixed(2) : '—') + '\t' + awmDesc + '\n';
    }

    var titleHtml = tableTitle ? '<p style="margin-bottom: 0.5em; font-weight: bold;">' + escapeHtml(tableTitle) + '</p>' : '';
    var interpHtml = '<p style="margin-top: 1em;">' + escapeHtml(interpText).replace(/\n/g, '<br>') + '</p>';
    var fullHtml = titleHtml + tableHtml + interpHtml;
    var fullPlain = (tableTitle ? tableTitle + '\n\n' : '') + tablePlain + '\n' + interpText;

    copyRichToClipboard(fullHtml, fullPlain);
  }

  function copyRichToClipboard(html, plain) {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      navigator.clipboard.writeText(plain).then(function () { showToast('Copied as text.'); }).catch(function () { showToast('Copy failed.', true); });
      return;
    }
    var blobHtml = new Blob([html], { type: 'text/html' });
    var blobPlain = new Blob([plain], { type: 'text/plain' });
    navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })
    ]).then(function () {
      showToast('Copied! Paste into Word to keep table format.');
    }).catch(function () {
      navigator.clipboard.writeText(plain).then(function () { showToast('Copied as text.'); }).catch(function () { showToast('Copy failed.', true); });
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
    var text = laInterpTwoGroup && (laInterpretationSh || laInterpretationT)
      ? (laInterpretationSh || '') + (laInterpretationT ? '\n\n' + laInterpretationT : '')
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
          projectId: activeProjectId || 'rp1',
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
          var indInput = tr.querySelector('[data-la-indicator]');
          var ind = (indInput && indInput.value != null) ? indInput.value.trim() : (base && base.indicator) || '';
          var shWmInput = tr.querySelector('[data-la-sh-wm]');
          var shQdInput = tr.querySelector('[data-la-sh-qd]');
          var tWmInput = tr.querySelector('[data-la-t-wm]');
          var tQdInput = tr.querySelector('[data-la-t-qd]');
          var shWm = shWmInput && shWmInput.value !== '' ? parseFloat(shWmInput.value) : (base && base.sh) ? base.sh.wm : 0;
          var tWm = tWmInput && tWmInput.value !== '' ? parseFloat(tWmInput.value) : (base && base.t) ? base.t.wm : 0;
          if (isNaN(shWm)) shWm = 0;
          if (isNaN(tWm)) tWm = 0;
          var shQd = shQdInput && shQdInput.value ? shQdInput.value.trim() : (base && base.sh) ? base.sh.qd : '';
          var tQd = tQdInput && tQdInput.value ? tQdInput.value.trim() : (base && base.t) ? base.t.qd : '';
          var shRankCell = tr.querySelector('[data-la-sh-rank]');
          var tRankCell = tr.querySelector('[data-la-t-rank]');
          var shRank = shRankCell && shRankCell.textContent ? parseFloat(shRankCell.textContent) : (base && base.sh) ? base.sh.rank : 0;
          var tRank = tRankCell && tRankCell.textContent ? parseFloat(tRankCell.textContent) : (base && base.t) ? base.t.rank : 0;
          rows.push({
            indicator: ind,
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
          projectId: activeProjectId || 'rp1',
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
        projectId: activeProjectId || 'rp1',
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
    localStorage.setItem(KEYS.likertDataSaved, 'true');
    appendActivity('Saved Likert table: ' + (toSave.tableTitle || 'Untitled'));
    updateSessionProgress();
    renderRecentActivity();
    showToast('Table saved.');
  }

  function updateSessionProgress() {
    var tables = document.getElementById('la-session-tables');
    var interpretations = document.getElementById('la-session-interpretations');
    if (tables) tables.textContent = getNumber(KEYS.tablesProcessed);
    if (interpretations) interpretations.textContent = getNumber(KEYS.interpretationsGenerated);
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
          '<th class="la-thesis-table__th la-thesis-table__th--no" scope="col">No.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--particulars" scope="col">Particulars</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--num" scope="col" title="Weighted Mean">W.M.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--qd" scope="col" title="Qualitative Description">Q.D.</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--rank" scope="col">Rank</th>' +
          '<th class="la-thesis-table__th la-thesis-table__th--action" scope="col">Remove</th>' +
        '</tr>';
    }
    if (tfoot) {
      tfoot.innerHTML =
        '<tr class="la-thesis-table__footer-row">' +
          '<td class="la-thesis-table__footer-value"></td>' +
          '<td class="la-thesis-table__footer-label"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-value">—</strong></td>' +
          '<td class="la-thesis-table__footer-value"><strong id="la-awm-desc">—</strong></td>' +
          '<td class="la-thesis-table__footer-value"></td>' +
          '<td class="la-thesis-table__footer-value"></td>' +
        '</tr>';
    }
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="la-output-empty">You may select a predefined table or manually enter your own indicators.</td></tr>';
    }
  }

  /** Manual table mode: one empty row, Compute enabled (no predefined table selected). */
  function renderManualLikertTable() {
    var tbody = document.getElementById('la-output-tbody');
    var thead = document.getElementById('la-output-thead');
    var tfoot = document.getElementById('la-output-tfoot');
    var tableWrap = document.getElementById('la-table-wrap');
    if (!tbody || !thead) return;
    if (tableWrap) tableWrap.classList.remove('la-thesis-table--two-group');
    thead.innerHTML =
      '<tr>' +
        '<th class="la-thesis-table__th la-thesis-table__th--no" scope="col">No.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--particulars" scope="col">Particulars</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--num" scope="col" title="Weighted Mean">W.M.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--qd" scope="col" title="Qualitative Description">Q.D.</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--rank" scope="col">Rank</th>' +
        '<th class="la-thesis-table__th la-thesis-table__th--action" scope="col">Remove</th>' +
      '</tr>';
    tfoot.innerHTML =
      '<tr class="la-thesis-table__footer-row">' +
        '<td class="la-thesis-table__footer-value"></td>' +
        '<td class="la-thesis-table__footer-label"><strong>AVERAGE WEIGHTED MEAN</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-value">—</strong></td>' +
        '<td class="la-thesis-table__footer-value"><strong id="la-awm-desc">—</strong></td>' +
        '<td class="la-thesis-table__footer-value"></td>' +
        '<td class="la-thesis-table__footer-value"></td>' +
      '</tr>';
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    tr.setAttribute('data-la-row-index', '0');
    tr.innerHTML =
      '<td class="la-thesis-table__td la-thesis-table__td--no">1</td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--indicator"><textarea class="la-thesis-input la-thesis-input--indicator" data-la-indicator placeholder="New indicator" rows="2"></textarea></td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--num"><input type="number" step="0.01" class="la-thesis-input la-thesis-input--wm" data-la-wm placeholder="0.00"></td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--qd"><input type="text" class="la-thesis-input la-thesis-input--qd" data-la-qd placeholder="Q.D."></td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--rank" data-la-rank>—</td>' +
      '<td class="la-thesis-table__td la-thesis-table__td--action"><button type="button" class="la-row-remove" aria-label="Remove row" data-la-remove>×</button></td>';
    tbody.appendChild(tr);
    var removeBtn = tr.querySelector('[data-la-remove]');
    if (removeBtn) removeBtn.addEventListener('click', function () { removeLikertOutputRow(tr); });
    tr.querySelectorAll('input, textarea').forEach(function (inp) {
      inp.addEventListener('input', onInputChange);
    });
    syncLikertConfigFromDom();
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    if (recomputeBtn) recomputeBtn.disabled = false;
    if (restoreBtn) restoreBtn.disabled = false;
    var titleEl = document.getElementById('la-table-title');
    if (titleEl) titleEl.value = '';
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    updateLiveStats(null, null);
    onInputChange();
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
    renderManualLikertTable();
    var block = document.getElementById('la-interpretation-block');
    if (block) block.textContent = '';
    var copyBtn = document.getElementById('la-copy-interpretation');
    var saveTableBtn = document.getElementById('la-save-table');
    var regenBtn = document.getElementById('la-regenerate-interpretation');
    var recomputeBtn = document.getElementById('la-recompute');
    var restoreBtn = document.getElementById('la-restore-original');
    if (copyBtn) copyBtn.disabled = true;
    if (saveTableBtn) saveTableBtn.disabled = true;
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
      localStorage.removeItem(KEYS.recentActivity);
      localStorage.removeItem(KEYS.likertDataSaved);
      localStorage.removeItem('tablesProcessed');
      localStorage.removeItem('respondentsEncoded');
      localStorage.removeItem('profileDataSaved');
      localStorage.removeItem('summaryDataSaved');
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
    var saveTableBtn = document.getElementById('la-save-table');
    if (saveTableBtn) saveTableBtn.disabled = true;
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
            renderManualLikertTable();
          }
        }
        updateSelectedTableSummary();
      });
    }

    var selectEl = document.getElementById('la-table-select');
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        var id = this.value;
        if (!id) {
          renderManualLikertTable();
          updateSelectedTableSummary();
          return;
        }
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
      });
    }
    if (qdAutoCheckbox) {
      qdAutoCheckbox.addEventListener('change', function () {
        updateScaleSectionVisibility();
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
    var copyScaleBtn = document.getElementById('la-copy-scale');
    if (copyScaleBtn) copyScaleBtn.addEventListener('click', copyScaleMapping);
    var scalePasteZone = document.getElementById('la-scale-paste-zone');
    if (scalePasteZone) {
      scalePasteZone.addEventListener('paste', handleScalePaste);
      scalePasteZone.addEventListener('focus', function () {
        var errEl = document.getElementById('la-scale-paste-error');
        if (errEl) errEl.textContent = '';
      });
    }
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
    var saveTableBtn = document.getElementById('la-save-table');
    if (saveTableBtn) saveTableBtn.addEventListener('click', saveToReport);

    var addRowBtn = document.getElementById('la-add-row');
    if (addRowBtn) addRowBtn.addEventListener('click', addLikertRow);

    var pasteZone = document.getElementById('la-paste-zone');
    var tableWrap = document.getElementById('la-table-wrap');
    if (pasteZone) {
      pasteZone.addEventListener('paste', handleLikertPaste);
      pasteZone.addEventListener('focus', function () {
        var errEl = document.getElementById('la-paste-table-error');
        if (errEl) errEl.textContent = '';
      });
    }
    if (tableWrap) {
      tableWrap.addEventListener('paste', handleLikertPaste);
      tableWrap.addEventListener('input', onInputChange);
    }

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
    var tableSelectInit = document.getElementById('la-table-select');
    if (tableSelectInit && tableSelectInit.value === '' && activeProjectId === 'rp1') {
      renderManualLikertTable();
    }
    updateSelectedTableSummary();
    onInputChange();
    updateScaleSectionVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
