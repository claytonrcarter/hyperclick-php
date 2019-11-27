<?php

require './test_2.php';
include( './test_2.php' );

// relative to parent dir
require_once './spec/test_2.php';

$var1 = "declare";

$var2 = "I do " + $var1 + "!";

function this_is_a_function($param1, $param2) {
  return $param1;
}
function also_a_func() { return; }

echo $var2;
echo "$var2";
echo $var_from_other_file;
echo $var1; echo $var2;

$v =  this_is_a_function( $var1, $var2, also_a_func() );

also_a_func(); also_a_func();

class ClassName
{

    function foo($argument)
    {
        $this->buzz = 1;
        $this->buzz; $this->buzz;
        $this -> buzz;
    }

    function bar($argument)
    {
        $this->foo(1);
    }

    function baz($argument)
    {
        // hmm, this might not even be valid PHP!
        $this->buzz;
        $this->buzz = 2;
        $this->buzz;
        $this->bar(2);
    }
}
