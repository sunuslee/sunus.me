---
layout: post
title: "Setting up a LAN with multiple gateway/interface with iptables and route policy under awesome Linux[2/2]"
date: 2013-03-17 10:48
comments: true
categories: 
---

# The Script of ArchLinux in solution Two #
{% include_code setArch.sh %}


# The Script of Route in final solution #

* see the **Working iptables rules** at here:
  * [https://gist.github.com/sunuslee/5179422](https://gist.github.com/sunuslee/5179422)
  * you probobly need to modify this file a little bit, or just create your own with ``iptables-save > filename``
  * make sure you have **PPP0-IP** in that file. because this script will replace **PPP0-IP** with the real **PPP0-IP** address.
  * you need to put the file working-iptables-rules along with setroute.sh, in the same directory.
  * if you are interested, those lines contain |sunus-a/b/c/d| are the Log, demonstration of how the packets went through all the way from one end to another.
  * this may have **bugs**, most likely.

{% include_code Setting the route setroute.sh %}
