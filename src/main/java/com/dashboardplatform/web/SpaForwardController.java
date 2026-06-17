package com.dashboardplatform.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class SpaForwardController {
    @GetMapping("/")
    public String forwardRoot() {
        return "forward:/index.html";
    }

    @GetMapping({"/{path:^(?!api$|assets$)[^.]*}", "/{path:^(?!api$|assets$)[^.]*}/**"})
    public String forwardClientRoute(@PathVariable String path) {
        return "forward:/index.html";
    }
}
