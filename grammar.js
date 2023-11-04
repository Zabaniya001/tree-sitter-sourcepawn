const PREC = {
  PAREN_DECLARATOR: -10,
  ASSIGNMENT: -2,
  CONDITIONAL: -1,
  DEFAULT: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EXCLUSIVE_OR: 4,
  BITWISE_AND: 5,
  EQUAL: 6,
  RELATIONAL: 7,
  OFFSETOF: 8,
  SHIFT: 9,
  ADD: 10,
  MULTIPLY: 11,
  CAST: 12,
  SIZEOF: 13,
  UNARY: 14,
  CALL: 15,
  FIELD: 16,
  SUBSCRIPT: 17,
};

module.exports = grammar({
  name: 'sourcepawn',

  rules: {
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $._expression_statement,
      $.function_definition
    ),

    _expression_statement: $ => seq(
      $._expression,
      ";"
    ),

    assignment_operator: $ => choice(
      '=',
      '*=',
      '/=',
      '%=',
      '+=',
      '-=',
      '<<=',
      '>>=',
      '&=',
      '^=',
      '|=',
    ),

    function_definition: $ => seq(
      optional($.function_visibility_type),
      optional($.storage_class_specifier),
      optional($.type_qualifier),
      field("type", $._type),
      field("name", $.identifier),
      field("parameters", $.parameter_list),
      field("body", $.block),
    ),

    parameter_list: $ => seq(
      "(",
      optional(
        commaSep(
          field("parameter", $.parameter_declaration)
        ),
      ),
      ")"
    ),

    parameter_declaration: $ => seq(
      optional($.type_qualifier),
      field("type", $._type),
      field("name", $.identifier),
      optional(seq("=", repeat($._expression)))
    ),

    block: $ => seq(
      "{",
      repeat($._block_item),
      "}"
    ),

    _block_item: $ => choice(
      $.block,
      $._expression_statement,
      $.return_statement,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.do_while_statement,
    ),

    while_statement: $ => seq(
      "while",
      $.parenthesized_expression,
      $._block_item,
    ),

    do_while_statement: $ => seq(
      "do",
      $._block_item,
      "while",
      field("condition", $.parenthesized_expression),
      optional(";"),
    ),

    for_statement: $ => seq(
      "for",
      $._for_statement_body,
      $._block_item,
    ),

    _for_statement_body: $ => seq(
      "(",
      field("initializer", optional($._expression)),
      ";",
      field("condition", optional($._expression)),
      ";",
      field("update", optional($._expression)),
      ")"
    ),

    parenthesized_expression: $ => seq(
      "(",
      $._expression,
      ")",
    ),

    if_statement: $ => prec.left(
      seq(
        "if",
        field("condition", $.parenthesized_expression),
        field("consequence", $._block_item),
        optional(field("alternative", seq("else", $._block_item))),
      ),
    ),

    return_statement: $ => seq(
      "return",
      repeat($._expression),
      ";"
    ),

    function_visibility_type: $ => choice(
      "public"
    ),

    variable_declaration: $ => prec.right(
        seq(
        optional($.storage_class_specifier),
        optional($.type_qualifier),
        field("type", $._type),
        field("name", $.identifier),
        optional(
          seq(
            "=",
            repeat($._expression),
          ),
        ),
      ),
    ),

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, 
      seq(
        field("left", $.identifier),
        field("operator", $.assignment_operator),
        field("right", $._expression),
      ),
    ),

    storage_class_specifier: $ => choice("static"),

    type_qualifier: $ => choice("const"),

    _type: $ => choice(
      $.primitive_type
    ),

    primitive_type: $ => choice(
      "int",
      "float",
      "char",
      "bool",
      "void",
      "any"
    ),

    _expression: $ => choice(
      $._non_binary_expression,
      $._binary_expression
    ),

    _non_binary_expression: $ => choice(
      field("variable", $.variable_declaration),
      $.identifier,
      $.numerical_expression,
      $.boolean_expression,
      $.string_expression,
      $.char_expression,
      $.null_expression,
      $.function_call_expression,
      $.sizeof_expression,
      $.view_as_expression,
    ),

    boolean_expression: $ => choice(
      "true",
      "false"
    ),

    null_expression: $ => "null",

    string_expression: $ => seq(
      '"',
      repeat(
        choice(token.immediate(prec(1, /[^"\\]|\\\r?\n/)), $.escape_sequence)
      ),
      '"'
    ),

    char_expression: $ => seq(
      "'",
      choice(
        $.escape_sequence,
        /[^\n']/
      ),
      "'"
    ),

    function_call_expression: $ => prec.left(PREC.CALL,
      seq(
        field("function_name", $.identifier),
        field("function_arguments", $.function_call_arguments),
      ),
    ),

    function_call_arguments: $ => seq(
      "(",
      optional(
        commaSep(
          seq(
            field("argument", $._expression),
            optional(seq("=", repeat($._expression)))
          )
        )
      ),
      ")"
    ),

    escape_sequence: $ => token(
      prec(
        1,
        seq(
          "\\",
          choice(
            /[^xuU]/,
            /\d{2,3}/,
            /x[0-9a-fA-F]{2,}/,
            /u[0-9a-fA-F]{4}/,
            /U[0-9a-fA-F]{8}/
          )
        )
      )
    ),

    sizeof_expression: $ => seq(
      "sizeof",
      "(",
      $._expression,
      ")"
    ),

    view_as_expression: $ => seq(
      "view_as",
      "<",
      $._type,
      ">",
      "(",
      $._expression,
      ")"
    ),
    
    // Various kinds of operations: Mathematical, logical, ...
    _binary_expression: $ => {
      const table = [
        ['+',  PREC.ADD],
        ['-',  PREC.ADD],
        ['*',  PREC.MULTIPLY],
        ['/',  PREC.MULTIPLY],
        ['%',  PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|',  PREC.INCLUSIVE_OR],
        ['^',  PREC.EXCLUSIVE_OR],
        ['&',  PREC.BITWISE_AND],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['>',  PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<',  PREC.RELATIONAL],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression),
        ));
      }));
    },

  identifier: $ => /[a-zA-Z_]\w*/,

   numerical_expression: $ => /\d+/,
  }
});

function commaSep(rule) {
  return seq(rule, repeat(seq(",", rule)))
}
