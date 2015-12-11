<?php

require './test_2.php';
include( './test_2.php' );

// relative to parent dir
require_once './spec/test_2.php'

$var1 = "declare";

$var2 = "I do " + $var1 + "!";

echo $var2;
echo "$var2";
echo $var_from_other_file;
