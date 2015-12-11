<?php

require './test2.php';
include( './test2.php' );

$var1 = "declare";

$var2 = "I do " + $var1 + "!";

echo $var2;
echo "$var2";
